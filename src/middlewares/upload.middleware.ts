import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { RequestHandler } from 'express';
import multer from 'multer';
import { ApiError } from '../utils/api-error';

const CV_UPLOAD_DIRECTORY = path.resolve(process.cwd(), 'uploads', 'cv');
const MAX_CV_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const allowedMimeTypes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]);

const allowedExtensions = new Set(['.pdf', '.doc', '.docx']);

fs.mkdirSync(CV_UPLOAD_DIRECTORY, { recursive: true });

const STAFF_UPLOAD_DIRECTORY = path.resolve(process.cwd(), 'uploads', 'staff');
const CLIENT_UPLOAD_DIRECTORY = path.resolve(process.cwd(), 'uploads', 'clients');
const CLIENT_PROOF_DIRECTORY = path.join(CLIENT_UPLOAD_DIRECTORY, 'proof-of-address');
const STAFF_PHOTO_DIRECTORY = path.join(STAFF_UPLOAD_DIRECTORY, 'photos');
const STAFF_CV_DIRECTORY = path.join(STAFF_UPLOAD_DIRECTORY, 'cv');
const MAX_STAFF_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const allowedStaffPhotoMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const allowedStaffCvMimeTypes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif'
]);
const allowedStaffPhotoExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const allowedStaffCvExtensions = new Set(['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.webp', '.gif']);
const allowedClientProofMimeTypes = new Set(['image/svg+xml', 'image/png', 'image/jpeg', 'image/gif']);
const allowedClientProofExtensions = new Set(['.svg', '.png', '.jpg', '.jpeg', '.gif']);

fs.mkdirSync(STAFF_PHOTO_DIRECTORY, { recursive: true });
fs.mkdirSync(STAFF_CV_DIRECTORY, { recursive: true });
fs.mkdirSync(CLIENT_PROOF_DIRECTORY, { recursive: true });


function sanitizeBaseFilename(originalName: string): string {
  const withoutExtension = originalName.replace(/\.[^/.]+$/, '');
  const sanitized = withoutExtension
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  return sanitized || 'upload';
}

function staffUploadPath(fieldName: string): string {
  return fieldName === 'photo' || fieldName === 'image' ? STAFF_PHOTO_DIRECTORY : STAFF_CV_DIRECTORY;
}

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, CV_UPLOAD_DIRECTORY);
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const safeBaseName = sanitizeBaseFilename(file.originalname);
    callback(null, `${safeBaseName}-${crypto.randomUUID()}${extension}`);
  }
});

const cvUpload = multer({
  storage,
  limits: {
    files: 1,
    fileSize: MAX_CV_SIZE_BYTES
  },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.has(extension) || !allowedMimeTypes.has(file.mimetype)) {
      callback(new ApiError(400, 'Invalid CV format. Allowed formats: PDF, DOC, DOCX.'));
      return;
    }
    callback(null, true);
  }
});

export const uploadWorkerCv: RequestHandler = (req, res, next) => {
  cvUpload.single('cv')(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        next(new ApiError(400, 'CV file is too large. Maximum size is 5MB.'));
        return;
      }
      next(new ApiError(400, `Invalid CV upload request: ${error.message}`));
      return;
    }
    next(error);
  });
};


const staffStorage = multer.diskStorage({
  destination: (_req, file, callback) => {
    callback(null, staffUploadPath(file.fieldname));
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const safeBaseName = sanitizeBaseFilename(file.originalname);
    callback(null, `${safeBaseName}-${crypto.randomUUID()}${extension}`);
  }
});

const staffUpload = multer({
  storage: staffStorage,
  limits: {
    files: 2,
    fileSize: MAX_STAFF_FILE_SIZE_BYTES
  },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (file.fieldname === 'photo' || file.fieldname === 'image') {
      if (!allowedStaffPhotoExtensions.has(extension) || !allowedStaffPhotoMimeTypes.has(file.mimetype)) {
        callback(new ApiError(400, 'Invalid photo format. Allowed formats: JPG, PNG, WEBP, GIF.'));
        return;
      }
      callback(null, true);
      return;
    }

    if (file.fieldname === 'cv') {
      if (!allowedStaffCvExtensions.has(extension) || !allowedStaffCvMimeTypes.has(file.mimetype)) {
        callback(new ApiError(400, 'Invalid CV format. Allowed formats: PDF, DOC, DOCX, JPG, PNG, WEBP, GIF.'));
        return;
      }
      callback(null, true);
      return;
    }

    callback(new ApiError(400, `Unsupported staff upload field: ${file.fieldname}`));
  }
});

export const uploadAdminPhoto: RequestHandler = (req, res, next) => {
  staffUpload.single('photo')(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        next(new ApiError(400, 'Admin photo is too large. Maximum size is 5MB.'));
        return;
      }
      next(new ApiError(400, `Invalid admin photo upload request: ${error.message}`));
      return;
    }
    next(error);
  });
};

export const uploadStaffFiles: RequestHandler = (req, res, next) => {
  staffUpload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'image', maxCount: 1 },
    { name: 'cv', maxCount: 1 }
  ])(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        next(new ApiError(400, 'Staff upload file is too large. Maximum size is 5MB.'));
        return;
      }
      next(new ApiError(400, `Invalid staff upload request: ${error.message}`));
      return;
    }
    next(error);
  });
};


const clientProofStorage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, CLIENT_PROOF_DIRECTORY);
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const safeBaseName = sanitizeBaseFilename(file.originalname);
    callback(null, `${safeBaseName}-${crypto.randomUUID()}${extension}`);
  }
});

const clientProofUpload = multer({
  storage: clientProofStorage,
  limits: {
    files: 1,
    fileSize: MAX_STAFF_FILE_SIZE_BYTES
  },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (!allowedClientProofExtensions.has(extension) || !allowedClientProofMimeTypes.has(file.mimetype)) {
      callback(new ApiError(400, 'Invalid proof of address format. Allowed formats: SVG, PNG, JPG, GIF.'));
      return;
    }
    callback(null, true);
  }
});

export const uploadClientProofOfAddress: RequestHandler = (req, res, next) => {
  clientProofUpload.single('proofOfAddress')(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        next(new ApiError(400, 'Proof of address file is too large. Maximum size is 5MB.'));
        return;
      }
      next(new ApiError(400, `Invalid proof of address upload request: ${error.message}`));
      return;
    }
    next(error);
  });
};

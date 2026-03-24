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

function sanitizeBaseFilename(originalName: string): string {
  const withoutExtension = originalName.replace(/\.[^/.]+$/, '');
  const sanitized = withoutExtension
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  return sanitized || 'cv';
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

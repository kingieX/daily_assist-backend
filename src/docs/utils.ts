import type { OpenAPIV3 } from 'openapi-types';

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'] as const;

type OperationMethod = (typeof HTTP_METHODS)[number];

function isOperationMethod(method: string): method is OperationMethod {
  return (HTTP_METHODS as readonly string[]).includes(method);
}

function hasJsonRequestBody(operation: OpenAPIV3.OperationObject): boolean {
  const requestBody = operation.requestBody as OpenAPIV3.RequestBodyObject | undefined;
  return Boolean(requestBody?.content?.['application/json']);
}

function hasMultipartRequestBody(operation: OpenAPIV3.OperationObject): boolean {
  const requestBody = operation.requestBody as OpenAPIV3.RequestBodyObject | undefined;
  return Boolean(requestBody?.content?.['multipart/form-data']);
}

function hasSecurity(operation: OpenAPIV3.OperationObject): boolean {
  return Boolean(operation.security?.some((entry) => Object.keys(entry).length > 0));
}

function buildDeveloperGuide(
  path: string,
  method: string,
  operation: OpenAPIV3.OperationObject
): string {
  const authGuide = hasSecurity(operation)
    ? 'Send `Authorization: Bearer <accessToken>` from the relevant login endpoint.'
    : 'No bearer token is required.';
  const requestBodyGuide = hasMultipartRequestBody(operation)
    ? 'Send `multipart/form-data` using the field names documented in the request body schema.'
    : hasJsonRequestBody(operation)
      ? 'Send `Content-Type: application/json` with the required fields documented in the request body schema.'
      : 'Do not send a request body.';

  return [
    '### Frontend request guide',
    `- **Method/URL:** \`${method.toUpperCase()} /api/v1${path}\``,
    `- **Auth:** ${authGuide}`,
    `- **Body:** ${requestBodyGuide}`,
    '- **Responses:** Success responses use `{ success: true, message, data? }`; errors use `{ success: false, message, code?, errors? }`.'
  ].join('\n');
}

function successContent(description: string): OpenAPIV3.ResponseObject['content'] {
  return {
    'application/json': {
      schema: { $ref: '#/components/schemas/SuccessResponse' },
      example: {
        success: true,
        message: description
      }
    }
  };
}

function normalizeResponse(response: OpenAPIV3.ReferenceObject | OpenAPIV3.ResponseObject): void {
  if ('$ref' in response) return;
  if (!response.content) {
    response.content = successContent(response.description || 'Operation successful');
  }
}

export function withEndpointGuides(paths: OpenAPIV3.PathsObject): OpenAPIV3.PathsObject {
  for (const [path, pathItem] of Object.entries(paths)) {
    if (!pathItem) continue;

    for (const [method, operation] of Object.entries(pathItem)) {
      if (!isOperationMethod(method) || !operation) continue;

      const operationObject = operation as OpenAPIV3.OperationObject;
      const existingDescription = operationObject.description?.trim();
      const guide = buildDeveloperGuide(path, method, operationObject);
      operationObject.description = existingDescription ? `${existingDescription}\n\n${guide}` : guide;

      operationObject.responses ??= {};
      for (const status of ['200', '201', '204']) {
        const response = operationObject.responses[status];
        if (response) normalizeResponse(response);
      }

      if (operationObject.requestBody && !operationObject.responses['400']) {
        operationObject.responses['400'] = { $ref: '#/components/responses/ValidationError' };
      }

      if (hasSecurity(operationObject)) {
        operationObject.responses['401'] ??= { $ref: '#/components/responses/UnauthorizedError' };
        operationObject.responses['403'] ??= { $ref: '#/components/responses/ForbiddenError' };
      }

      operationObject.responses['500'] ??= { $ref: '#/components/responses/InternalError' };
    }
  }

  return paths;
}

import { isProduction } from 'app/config/env.js';
import { doubleCsrf } from 'csrf-csrf';

const { doubleCsrfProtection, generateCsrfToken, validateRequest } = doubleCsrf(
  {
    getSecret: () => process.env.CSRF_SECRET!,
    getSessionIdentifier: () => '',
    cookieName: '__csrf',
    cookieOptions: {
      httpOnly: true,
      sameSite: isProduction() ? 'none' : 'strict',
      secure: isProduction(),
    },
  },
);

export { doubleCsrfProtection, generateCsrfToken, validateRequest };

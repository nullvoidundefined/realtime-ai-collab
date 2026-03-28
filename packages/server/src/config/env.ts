export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function getPort(): number {
  return parseInt(process.env.PORT ?? '3001', 10);
}

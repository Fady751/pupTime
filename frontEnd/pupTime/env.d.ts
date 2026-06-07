declare module '@env' {
  export const API_URL: string;
  export const WS_URL: string;
  export const googleWebClientId: string;
  export const DATABASE_NAME: string;
}

declare module "*.png" {
  const value: any;
  export default value;
}

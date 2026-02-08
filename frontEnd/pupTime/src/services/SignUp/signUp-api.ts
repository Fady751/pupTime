export type SignUpPayload = {
  username: string;
  email: string;
  password: string;
  gender: string;
  birthDate: string;
};

export type SignUpResponse = {
  success: boolean;
  message: string;
  userId?: string;
};

export const signUp = async (
  payload: SignUpPayload,
): Promise<SignUpResponse> => {
  console.log('Mock signUp payload:', payload);

  return new Promise(resolve => {
    setTimeout(() => {
      resolve({
        success: true,
        message: 'Mock sign up success',
        userId: 'temp-user-id',
      });
    }, 1000);
  });
};

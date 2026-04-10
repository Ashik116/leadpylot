import { useState } from 'react';

const useGeneratePassword = () => {
  const [uniqPassword, setPassword] = useState('');

  const generatePassword = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let uniq = '';
    for (let i = 0; i < 12; i++) {
      uniq += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    setPassword(uniq);
  };

  return { uniqPassword, generatePassword };
};

export default useGeneratePassword;

'use client';
import { useState } from 'react';
import uniqueId from 'lodash/uniqueId';
import createUID from '../utils/createUid';

export default function useUniqueId(prefix = '', len = 10) {
  const [id] = useState(() => `${uniqueId(prefix)}-${createUID(len)}`);
  return id;
}

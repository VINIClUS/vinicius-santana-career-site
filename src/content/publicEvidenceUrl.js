import { z } from 'astro/zod';

export const publicEvidenceUrl = z.string().url().refine((value) => URL.canParse(value) && new URL(value).protocol === 'https:', {
  message: 'Public evidence URLs must use HTTPS'
});

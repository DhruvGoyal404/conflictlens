// Realistic sample with two conflicts, used by the "Load sample" button.
export const SAMPLE = `import { fetchJson } from "./http";

<<<<<<< HEAD
const API_URL = "https://api.example.com/v2";
const TIMEOUT_MS = 5000;
=======
const API_URL = "https://staging.example.com/v1";
const TIMEOUT_MS = 8000;
>>>>>>> feature/staging-api

export async function getUser(id: string) {
<<<<<<< HEAD
  return fetchJson(\`\${API_URL}/users/\${id}\`, { timeout: TIMEOUT_MS });
=======
  const res = await fetchJson(\`\${API_URL}/user?id=\${id}\`, { timeout: TIMEOUT_MS });
  return res.data;
>>>>>>> feature/staging-api
}
`;

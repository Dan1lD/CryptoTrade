export async function apiRequest(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const sessionId = localStorage.getItem("sessionId");
  
  const headers = {
    "Content-Type": "application/json",
    ...(sessionId && { "x-session-id": sessionId }),
    ...options.headers,
  };

  return fetch(url, {
    ...options,
    headers,
  });
}

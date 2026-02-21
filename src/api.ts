const API_URL = "/api/payments";

export async function loadPayments(
  pin: string,
): Promise<Record<string, number>> {
  const res = await fetch(API_URL, {
    headers: { "x-pin": pin },
  });
  if (res.status === 401) throw new Error("Wrong PIN");
  if (!res.ok) throw new Error(`Load failed: ${res.status}`);
  return res.json();
}

export async function savePayments(
  pin: string,
  payments: Record<string, number>,
): Promise<void> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-pin": pin },
    body: JSON.stringify(payments),
  });
  if (res.status === 401) throw new Error("Wrong PIN");
  if (!res.ok) throw new Error(`Save failed: ${res.status}`);
}

interface PaymentRequestPayload {
  allow_repeated_payments: boolean;
  send_email: boolean;
  amount: string;
  purpose: string;
  buyer_name: string;
  email: string;
  phone: string;
}

interface PaymentRequestResponse {
  shorturl: string;
}

async function createPaymentLink(
  amount: string,
  purpose: string,
  buyer_name: string,
  email: string,
  phone: string
): Promise<string | undefined> {
  const url = 'https://www.instamojo.com/api/1.1/payment-requests/';
  const payload = {
    allow_repeated_payments: 'false',
    send_email: 'false',
    amount,
    purpose,
    buyer_name,
    email,
    phone
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Api-Key': process.env.INSTAMOJO_CLIENT_ID!,
        'X-Auth-Token': process.env.INSTAMOJO_CLIENT_SECRET!,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams(payload).toString()
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: PaymentRequestResponse = await response.json();
    console.log(result.shorturl);
    return result.shorturl;
  } catch (error) {
    console.error('Error creating payment link:', error);
    throw error;
  }
}

interface PaymentData {
  id: string;
  title: string;
  payment_type: string;
  payment_request: string;
  status: string;
  link: string;
  product: string;
  seller: string;
  currency: string;
  amount: string;
  name: string;
  email: string;
  phone: string;
  payout: string;
  fees: string;
  total_taxes: string;
  affiliate_id: string;
  affiliate_commission: string;
  order_info?: {
    shipping_address?: string;
    shipping_city?: string;
    shipping_state?: string;
    shipping_zip?: string;
    shipping_country?: string;
    quantity?: string;
    unit_price?: string;
  };
  instrument_type: string;
  billing_instrument: string;
  failure: string;
  bank_reference_number: string;
  created_at: string;
  updated_at: string;
  completed_at: string;
  tax_invoice_id: string;
  resource_uri: string;
}

async function fetchPayments(payment_id: string): Promise<PaymentData | undefined> {
  const url = `https://www.instamojo.com/api/1.1/payments/${payment_id}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Api-Key': process.env.INSTAMOJO_CLIENT_ID!,
        'X-Auth-Token': process.env.INSTAMOJO_CLIENT_SECRET!
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: PaymentData = await response.json();

    // Log the data instead of appending to sheets
    console.log('Payment data:', data);

    // If status is 'Credit', send notification
    if (data.status === 'Credit') {
      // sendNotification(data.title, data.name, data.phone, data.email, payment_id);
      console.log('Sending notification for payment:', payment_id);
    }

    return data;
  } catch (error) {
    console.error(`Error fetching payment details for ID ${payment_id}:`, error);
    return undefined;
  }
}

export { createPaymentLink, fetchPayments };
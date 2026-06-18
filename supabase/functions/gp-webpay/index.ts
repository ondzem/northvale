// Supabase Edge Function for GP webpay Integration
// Serves Deno runtime natively using Web Crypto API.
// Deploy via Supabase CLI: supabase functions deploy gp-webpay

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Helpers for Base64 and ArrayBuffer conversion
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64.replace(/\s/g, ""));
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert PEM format key (with header/footer) to clean DER buffer
function pemToDerBuffer(pem: string, type: "private" | "public"): ArrayBuffer {
  const header = type === "private" ? "-----BEGIN PRIVATE KEY-----" : "-----BEGIN PUBLIC KEY-----";
  const footer = type === "private" ? "-----END PRIVATE KEY-----" : "-----END PUBLIC KEY-----";
  
  const cleanPem = pem
    .replace(header, "")
    .replace(footer, "")
    .replace(/\s/g, "");
  return base64ToArrayBuffer(cleanPem);
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.pathname.split("/").pop(); // "sign" or "verify"

    // Load merchant credentials from Environment Variables
    const merchantId = Deno.env.get("GP_WEBPAY_MERCHANT_ID") || "916410001";
    const privateKeyPem = Deno.env.get("GP_WEBPAY_PRIVATE_KEY"); // PEM formatted private key
    const gpePublicKeyPem = Deno.env.get("GP_WEBPAY_GPE_PUBLIC_KEY"); // PEM formatted GPE public key

    if (action === "sign") {
      if (!privateKeyPem) {
        throw new Error("Missing GP_WEBPAY_PRIVATE_KEY environment variable.");
      }

      const body = await req.json();
      const { orderId, amount, currency = "203", returnUrl } = body; // amount is in cents, currency 203 = CZK

      if (!orderId || !amount || !returnUrl) {
        return new Response(JSON.stringify({ error: "Missing required parameters (orderId, amount, returnUrl)" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const operation = "CREATE_ORDER";
      const depositFlag = "1";

      // Concatenated signing string (strict order as per GP webpay API specs)
      // MERCHANTNUMBER | OPERATION | ORDERNUMBER | AMOUNT | CURRENCY | DEPOSITFLAG | URL
      const signString = `${merchantId}|${operation}|${orderId}|${amount}|${currency}|${depositFlag}|${returnUrl}`;

      // Import private key via Web Crypto API (requires PKCS#8 DER format)
      const privateKeyDer = pemToDerBuffer(privateKeyPem, "private");
      const privateKey = await crypto.subtle.importKey(
        "pkcs8",
        privateKeyDer,
        {
          name: "RSASSA-PKCS1-v1_5",
          hash: "SHA-1",
        },
        false,
        ["sign"]
      );

      // Sign the text
      const encoder = new TextEncoder();
      const signatureBuffer = await crypto.subtle.sign(
        "RSASSA-PKCS1-v1_5",
        privateKey,
        encoder.encode(signString)
      );

      const signatureBase64 = arrayBufferToBase64(signatureBuffer);

      // Return parameters including the generated signature
      const responseData = {
        MERCHANTNUMBER: merchantId,
        OPERATION: operation,
        ORDERNUMBER: orderId.toString(),
        AMOUNT: amount.toString(),
        CURRENCY: currency.toString(),
        DEPOSITFLAG: depositFlag,
        URL: returnUrl,
        DIGEST: signatureBase64,
      };

      return new Response(JSON.stringify(responseData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "verify") {
      if (!gpePublicKeyPem) {
        throw new Error("Missing GP_WEBPAY_GPE_PUBLIC_KEY environment variable.");
      }

      const body = await req.json();
      const { 
        MERCHANTNUMBER, 
        OPERATION, 
        ORDERNUMBER, 
        MERORDERNUM, 
        PRCODE, 
        SRCODE, 
        RESULTTEXT, 
        DIGEST 
      } = body;

      if (!ORDERNUMBER || !PRCODE || !DIGEST) {
        return new Response(JSON.stringify({ error: "Missing verification parameters" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Reconstruct signature verification string (strict order)
      // MERCHANTNUMBER | OPERATION | ORDERNUMBER | PRCODE | SRCODE
      // Append MERORDERNUM and RESULTTEXT if they exist
      let verifyString = `${OPERATION}|${ORDERNUMBER}`;
      if (MERORDERNUM) {
        verifyString += `|${MERORDERNUM}`;
      }
      verifyString += `|${PRCODE}|${SRCODE}`;
      if (RESULTTEXT) {
        verifyString += `|${RESULTTEXT}`;
      }

      // Import GPE Public Key
      const publicKeyDer = pemToDerBuffer(gpePublicKeyPem, "public");
      const publicKey = await crypto.subtle.importKey(
        "spki",
        publicKeyDer,
        {
          name: "RSASSA-PKCS1-v1_5",
          hash: "SHA-1",
        },
        false,
        ["verify"]
      );

      // Verify the signature
      const encoder = new TextEncoder();
      const isVerified = await crypto.subtle.verify(
        "RSASSA-PKCS1-v1_5",
        publicKey,
        base64ToArrayBuffer(DIGEST),
        encoder.encode(verifyString)
      );

      const paymentSuccess = isVerified && PRCODE === "0";

      return new Response(JSON.stringify({ 
        verified: isVerified, 
        success: paymentSuccess,
        orderId: ORDERNUMBER,
        prCode: PRCODE,
        srCode: SRCODE
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default 404 response
    return new Response(JSON.stringify({ error: "Endpoint not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

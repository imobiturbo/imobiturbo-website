// Cloudflare Pages Function: /api/lead
// Encaminha leads da Landing Page institucional para o Imobiturbo OS

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const OS_FORM_ENDPOINT =
  'https://os.imobiturbo.com.br/api/v1/public/form-sources/imt_lp_oficial_30e9db2c23e85e4915f76d8407f0d3f2';

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestPost(context) {
  const { request } = context;

  try {
    let payload = {};
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      payload = await request.json();
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const text = await request.text();
      payload = Object.fromEntries(new URLSearchParams(text));
    } else {
      payload = await request.json();
    }

    // Validação mínima de contato
    const nome = payload.nome || payload.name || '';
    const telefone = payload.telefone || payload.phone || payload.whatsapp || '';
    const email = payload.email || '';

    if (!telefone && !email) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Informe telefone ou e-mail para prosseguir.' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // Adiciona metadados de requisição da Cloudflare se não estiverem presentes
    const clientIp = request.headers.get('cf-connecting-ip');
    const country = request.headers.get('cf-ipcountry');
    if (clientIp && !payload.client_ip) payload.client_ip = clientIp;
    if (country && !payload.client_country) payload.client_country = country;

    // Encaminha para o Imobiturbo OS
    const osResponse = await fetch(OS_FORM_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Imobiturbo-Website/1.0',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await osResponse.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    return new Response(JSON.stringify(responseData), {
      status: osResponse.status,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message || 'Erro ao processar formulário' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
}

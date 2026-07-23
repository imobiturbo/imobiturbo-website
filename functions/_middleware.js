export function onRequest({ request, next }) {
  const url = new URL(request.url);
  if (url.hostname === 'imobiturbo.com.br') {
    url.hostname = 'www.imobiturbo.com.br';
    return Response.redirect(url.toString(), 301);
  }
  return next();
}

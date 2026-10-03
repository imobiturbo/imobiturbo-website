import { handlePage } from '../../seo/site.mjs';
export const onRequest = ({ request }) => handlePage(request);

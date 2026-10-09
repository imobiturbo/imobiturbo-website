(() => {
  'use strict';
  const {plan, cycle} = window.OSOffer.selection(location.search);
  const url = window.OSOffer.checkoutURL(plan, cycle);
  document.querySelector('#activate-os').href = url;
  location.replace(url);
})();

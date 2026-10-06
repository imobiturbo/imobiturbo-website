(() => {
  'use strict';
  const offer = window.OSOffer;
  let { plan, cycle } = offer.selection(location.search);
  function render() {
    const selected = offer.plans[plan];
    const price = offer.price(plan, cycle);
    document.querySelectorAll('[data-cycle]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.cycle === cycle)));
    document.querySelectorAll('input[name="plan"]').forEach(input => { input.checked = input.value === plan; });
    document.querySelectorAll('[data-checkout-price]').forEach(element => { element.textContent = offer.price(element.dataset.checkoutPrice, cycle).headline; });
    document.querySelector('#summary-plan').textContent = selected.name;
    document.querySelector('#summary-cycle').textContent = cycle === 'annual' ? 'Anual' : 'Mensal';
    document.querySelector('#summary-price').textContent = price.headline;
    document.querySelector('#summary-detail').textContent = price.detail;
    document.querySelector('#checkout-features').replaceChildren(...selected.features.map(text => { const li = document.createElement('li'); li.textContent = text; return li; }));
    document.querySelector('#activate-os').href = offer.activationURL(plan, cycle);
    document.querySelector('#existing-checkout').href = offer.existingAccessURL();
    const guarantee = document.querySelector('#summary-guarantee p');
    guarantee.textContent = cycle === 'annual' ? 'Garantia incondicional de 7 dias na oferta anual.' : 'Mensal sem fidelidade. Cancele quando quiser.';
    history.replaceState(null, '', offer.checkoutURL(plan, cycle));
    document.title = `${selected.name} ${cycle === 'annual' ? 'anual' : 'mensal'} — Imobiturbo OS`;
  }
  document.querySelectorAll('input[name="plan"]').forEach(input => input.addEventListener('change', () => { plan = input.value; render(); }));
  document.querySelectorAll('[data-cycle]').forEach(button => button.addEventListener('click', () => { cycle = button.dataset.cycle; render(); }));
  render();
})();

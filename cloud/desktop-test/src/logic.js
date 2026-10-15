(function(root, factory) {
  const moduleExport = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = moduleExport;
  if (root) root.TrummLogic = moduleExport;
})(typeof window !== 'undefined' ? window : null, function() {
  'use strict';
  const money = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  function parseMoney(value, {optional = false} = {}) {
    let raw = String(value == null ? '' : value).trim().replace(/[\s\u00a0\u20ac]/g, '');
    if (!raw && optional) return 0;
    if (!raw) throw Error('Bitte einen Geldbetrag eingeben.');
    if (raw.includes(',') && raw.includes('.')) {
      if (raw.lastIndexOf(',') > raw.lastIndexOf('.')) raw = raw.replace(/\./g, '').replace(',', '.');
      else raw = raw.replace(/,/g, '');
    } else if (raw.includes(',')) raw = raw.replace(',', '.');
    if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) throw Error('Ungueltiger Betrag: ' + value);
    const v = Number(raw);
    if (!Number.isFinite(v) || v > 999999999999.99) throw Error('Betrag ausserhalb des erlaubten Bereichs.');
    return money(v);
  }
  function count(value) {
    const x = String(value).trim();
    const n = Number(x);
    if (!/^\d+$/.test(x) || n < 1 || n > 1000000) throw Error('Stueckzahl muss zwischen 1 und 1.000.000 liegen.');
    return n;
  }
  function euro(n) {
    return Number(n || 0).toLocaleString('de-AT',{minimumFractionDigits:2,maximumFractionDigits:2}) + ' EUR';
  }
  function productSort(a,b) { return String(a.name).localeCompare(String(b.name),'de'); }
  function fifoPreview(lots, productId, quantity) {
    let missing = quantity;
    let cost = 0;
    const allocations=[];
    for (const lot of [...lots].filter(l=>l.product_id===productId && Number(l.available_qty)>0)
      .sort((a,b)=>String(a.bought_on).localeCompare(String(b.bought_on)) ||
        String(a.created_at).localeCompare(String(b.created_at)) || String(a.id).localeCompare(String(b.id)))) {
      if (!missing) break;
      const available=Number(lot.available_qty), qty=Math.min(missing,available);
      const remainingCost=money(Number(lot.purchase_total)+Number(lot.extra_cost)-Number(lot.allocated_cost));
      const amount=qty===available ? remainingCost : Math.min(money((Number(lot.purchase_total)+Number(lot.extra_cost))*qty/Number(lot.purchased_qty)),remainingCost);
      allocations.push({lot_id:lot.id,qty,cost:amount});
      cost=money(cost+amount); missing-=qty;
    }
    return {cost,missing,allocations};
  }
  function profit({price,shippingIncome,shippingCost,fees,other,cost}) {
    return money(price+shippingIncome-shippingCost-fees-other-cost);
  }
  function apiError(err) {
    const m=String(err?.message || err || 'Unbekannter Fehler');
    if (err?.code==='23505' || /duplicate key|tc_products_sku_unique/.test(m))
      return 'Artikelnummer bereits verwendet, bitte andere waehlen.';
    if (/JWT|token|Invalid login credentials|email not confirmed/i.test(m)) return 'Anmeldung fehlgeschlagen oder abgelaufen. Bitte Benutzer und Passwort pruefen.';
    if (/permission denied|row-level security|Nicht autorisiert/i.test(m)) return 'Zugriff verweigert. Nur das freigeschaltete Testkonto kann buchen.';
    if (/Failed to fetch|NetworkError|fetch failed/i.test(m)) return 'Keine Verbindung zur Cloud. Bitte Internet und Supabase-Projekt pruefen.';
    return m;
  }
  function amountInput(n) {return Number(n).toFixed(2).replace('.', ',');}
  return {money,parseMoney,count,euro,productSort,fifoPreview,profit,apiError,amountInput};
});

# Datenübernahme aus TrummCards 1.6.1 (nur Vorbereitung)

## Welche Daten gibt es heute?

Die bestehende Electron-/HTML-Anwendung speichert eine Struktur `trummcards_inventory_v1` in `localStorage`:

```json
{
  "version": 2,
  "lots": [{"id":"...","name":"...","set":"...","language":"...","condition":"...","sku":"...","date":"2026-10-01","qty":2,"total":200,"extra":0,"unitCost":100,"source":"...","note":"..."}],
  "sales": [{"id":"...","itemKey":"...","date":"2026-10-02","qty":1,"price":130,"shippingIncome":0,"shippingCost":5,"fees":6,"other":0,"cost":100,"platform":"eBay","allocations":[{"lotId":"...","qty":1,"unitCost":100}]}],
  "images": [{"lotId":"...","data":"data:image/jpeg;base64,..."}]
}
```

Die JSON-Datensicherung aus dem Programm **inklusive Bilder** ist die Migrationsquelle. Sie ersetzt keine regelmäßige Sicherung. Wichtige Fakten: Ein Kauf ist eine Charge (`lot`), Verkäufe referenzieren Chargen über `allocations`, `unitCost` kann eine Dezimalzahl mit mehr als zwei Stellen sein, Bilder gehören zu einer Charge und Artikelnummern sind nicht notwendigerweise vorhanden.

## Feldzuordnung

| Alt (Backup) | Neu (Cloud) | Hinweis |
|---|---|---|
| `lots[].name,set,language,condition,sku` | `tc_products.name,set_name,language,card_condition,sku` | Normalisierter Produktschlüssel. Gleiche Karte/Variante aus mehreren Käufen ergibt **ein** Produkt. |
| `lots[].id` | `tc_purchase_lots.id` plus `legacy_id_map` | Alte String-ID auf neue UUID abbilden. |
| `lots[].date,qty,total,extra,source,note` | `tc_purchase_lots.bought_on,purchased_qty,purchase_total,extra_cost,source,note` | **total ist der Gesamtpreis der Charge**, nicht Stückpreis. |
| Verkäufe `sales[].id,date,qty,price,...` | `tc_sales` | Status `booked`, Erlöse, Versand, Gebühren in EUR. |
| `sales[].allocations[].lotId,qty,unitCost` | `tc_sale_allocations` | Historische FIFO-Zuordnungen erhalten. Keine Neubewertung anhand aktueller Einstandspreise. |
| `sales[].cost` | `tc_sales.cogs_total` | Historischer Einstand des Verkaufs, damit alte Gewinnzahlen erhalten bleiben. |
| `lots[].qty - Summe(allocations.qty)` | `tc_purchase_lots.available_qty` | Muss >= 0 sein. |
| `sum(allocations.cost_amount)` | `tc_purchase_lots.allocated_cost` | Muss in Bilanz bleiben; Rundungsreste gesondert prüfen. |
| `images[].lotId,data` | Storage und `tc_lot_images` | JPEG, PNG oder WebP als private Objekte; keine Base64-Strings in PostgreSQL. |

## Sicherer Vierstufen-Import

**A. Export (nur lokal):** Im installierten TrummCards `Datensicherung → JSON exportieren` wählen. Original-Backup an zwei geschützten Orten kopieren. Während späterer Übergangsphase Verkäufe nicht gleichzeitig in Cloud und alter App buchen.

**B. Trockenprüfung (jetzt implementiert):** `node cloud/scripts/prepare-legacy-import.mjs /PFAD/TrummCards_Backup.json`. Das Skript prüft eindeutige IDs, SKUs, Datum, Beträge, Einkaufsmengen, Zuordnungen, COGS und verfügbare Menge. `--out /PRIVAT/import-plan.json` erzeugt optional eine **lokale** Vorschau mit UUID-Zuordnung. *Es gibt keinen Supabase-Zugriff in diesem Skript.* Keine Übertragung an ChatGPT oder GitHub.

**C. Import unter Freigabe (spätere Phase):** Ein noch zu entwickelnder Import-Executor verwendet das geprüfte Mapping, startet eine einzelne DB-Transaktion und sperrt den Cloud-Import gegen parallele Buchungen. `import_batches.backup_sha256` verhindert doppelte Imports. In die DB kommen zuerst `tc_products`, dann `tc_purchase_lots`, `tc_sales`, `tc_sale_allocations`, `tc_stock_movements`. Einkaufs- und Verkaufs-Summen, Historie und FIFO werden vollständig aus dem Backup übernommen, nicht neu erfunden. Der Executor muss in einer Serverumgebung laufen und benötigt privilegierte DB-Zugangsdaten **nur lokal/auf Server**, niemals in der App oder im Repository. Bei einem Fehler: **ROLLBACK**, keine Teildaten.

**D. Bilder & Abgleich (spätere Phase):** Bild-Dateien werden privat unter `<OWNER_UUID>/<LOT_UUID>/<IMAGE_UUID>.<ext>` gespeichert, danach `tc_lot_images` registriert. Wiederaufnahmen müssen per SHA und UUID idempotent sein. Bilder lassen sich nicht in derselben DB-Transaktion wie Postgres-Datensätze hochladen: Bei Fehlern Rücknahme-/Aufräumstrategie erforderlich. Vor Umschaltung abgleichen: Anzahl Produkte, Chargen, Verkäufe, Bilder, Verkaufswert, Warenwert, Stückzahlen, Gewinn aller Verkäufe. Import erst nach Freigabe finalisieren.

## Grenzfälle, die bewusst NICHT automatisch übernommen werden

- Gleiches SKU bei unterschiedlichen Produkten → **Stop**, manuell korrigieren.
- Alte Verkäufe mit negativen Mengen/fehlenden Chargen → **Stop**.
- Verbrauch größer als Einkauf → **Stop**.
- Historischer Verkaufseinstand stimmt nicht mit Summe der Chargen überein → Warnung, **manuelle Prüfung vor Commit**.
- Ausverkaufte Charge mit nicht vollständig zugeordneten Kosten → Warnung, **manuelle Prüfung**.
- Bereits gefüllte Cloud-Datenbank → **kein additiver Import** ohne ausdrücklichen Migrationsplan.
- Mehrere Backups desselben Lagerbestands → keine additive Zusammenführung; nur ein freigegebener Stichtag.

## Sicherheitsregel

Weder ein echtes Backup noch `import-plan.json`, Zugangstokens oder Bilder dürfen ins öffentliche GitHub-Repository. Der vorhandene Windows-Datenbestand wird durch Phase 1 **nicht** geändert. GitHub-Auto-Releases dürfen diesen Entwicklungszweig nicht automatisch veröffentlichen.

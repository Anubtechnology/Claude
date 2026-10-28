// ============================================================================
// White Concrete - ZATCA Phase 1 (generation phase) QR code
// Adobe LiveCycle Designer script for the White Concrete billing form copy
// (Maintain Form Templates, data provider FDP_V3_BD_STANDARD_SRV).
//
// QR content = Base64( TLV tag1..tag5 ), per ZATCA "Guide to Developed FATOORA
// Compliant QR Code" (18 Nov 2021) and the Security Features Implementation
// Standard, Table "QR Code content TLV field definitions":
//   1 Seller's name   2 Seller VAT no.   3 Invoice timestamp (ISO 8601)
//   4 Invoice total incl. VAT            5 VAT total
// Tags 6-9 (hash, signatures) are Phase 2 only and come from eDocument (DRC)
// once White Concrete is integrated in 2027 - do NOT add them here.
//
// HOW TO USE IN LIVECYCLE DESIGNER
// 1. Hierarchy > (root subform) > Variables > New Script Object, name it "zatca".
//    Paste PART A into it (language JavaScript).
// 2. Add a Barcode > QR Code object where the QR must print.
//    Object > Value: Type "Read Only", Binding: "No Data Binding".
//    Barcode properties: Max Data Length 500 (Phase 1 string is ~150 chars).
// 3. Paste PART B into that QR object's "initialize" event,
//    Language JavaScript, Run At "Server". Replace the 5 <<...>> paths with
//    the fields from the Data View (drag the field onto the canvas once to see
//    its $record path, then delete it).
// 4. If "Optimize data service" is ticked on the template, fields read only by
//    script are NOT sent to the form. Either untick it or bind each of the 5
//    fields to a hidden field on the form.
// ============================================================================


// ---------------------------- PART A: script object "zatca" ----------------

// UTF-8 bytes of a string (Arabic seller names need 2 bytes per letter).
function utf8(s) {
  var out = [];
  for (var i = 0; i < s.length; i++) {
    var c = s.charCodeAt(i);
    if (c >= 0xD800 && c <= 0xDBFF && i + 1 < s.length) {
      var d = s.charCodeAt(i + 1);
      if (d >= 0xDC00 && d <= 0xDFFF) {
        c = 0x10000 + ((c - 0xD800) << 10) + (d - 0xDC00);
        i++;
      }
    }
    if (c < 0x80) {
      out.push(c);
    } else if (c < 0x800) {
      out.push(0xC0 | (c >> 6), 0x80 | (c & 63));
    } else if (c < 0x10000) {
      out.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    } else {
      out.push(0xF0 | (c >> 18), 0x80 | ((c >> 12) & 63),
               0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
  }
  return out;
}

function base64(bytes) {
  var abc = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var out = "";
  for (var i = 0; i < bytes.length; i += 3) {
    var b1 = bytes[i];
    var b2 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    var b3 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    out += abc.charAt(b1 >> 2);
    out += abc.charAt(((b1 & 3) << 4) | (b2 >> 4));
    out += i + 1 < bytes.length ? abc.charAt(((b2 & 15) << 2) | (b3 >> 6)) : "=";
    out += i + 2 < bytes.length ? abc.charAt(b3 & 63) : "=";
  }
  return out;
}

// SAP raw date "20261101" or "2026-11-01" + time "143000" or "14:30:00"
// -> "2026-11-01T14:30:00". Pass suffix "Z" only if the time is UTC.
function timestamp(sapDate, sapTime, suffix) {
  var d = String(sapDate).replace(/[^0-9]/g, "");
  var t = String(sapTime).replace(/[^0-9]/g, "");
  while (t.length < 6) t = "0" + t;
  return d.substr(0, 4) + "-" + d.substr(4, 2) + "-" + d.substr(6, 2) + "T" +
         t.substr(0, 2) + ":" + t.substr(2, 2) + ":" + t.substr(4, 2) +
         (suffix ? suffix : "");
}

// Amount as plain "1150.00" (no thousands separator, dot decimal).
function amount(v) {
  return Math.abs(parseFloat(String(v).replace(/,/g, ""))).toFixed(2);
}

function phase1Qr(sellerName, vatNumber, ts, totalWithVat, vatTotal) {
  var fields = [sellerName, vatNumber, ts, totalWithVat, vatTotal];
  var bytes = [];
  for (var t = 0; t < fields.length; t++) {
    var v = utf8(String(fields[t]));
    if (v.length > 255) {
      throw "ZATCA QR tag " + (t + 1) + " longer than 255 bytes";
    }
    bytes.push(t + 1, v.length);
    for (var k = 0; k < v.length; k++) bytes.push(v[k]);
  }
  return base64(bytes);
}


// ---------------------------- PART B: QR object "initialize" event ---------
/*
function val(path) {
  var n = xfa.resolveNode(path);
  return n === null ? "" : n.value;
}

this.rawValue = zatca.phase1Qr(
  "<<White Concrete legal name exactly as on the VAT certificate>>",
  val("<<$record path of seller (company code) VAT registration number>>"),
  zatca.timestamp(val("<<$record path of billing creation date>>"),
                  val("<<$record path of billing creation time>>")),
  zatca.amount(val("<<$record path of total amount incl. VAT>>")),
  zatca.amount(val("<<$record path of total VAT amount>>"))
);
*/

// Node test hook (ignored by LiveCycle).
if (typeof module !== "undefined") {
  module.exports = { utf8: utf8, base64: base64, timestamp: timestamp,
                     amount: amount, phase1Qr: phase1Qr };
}

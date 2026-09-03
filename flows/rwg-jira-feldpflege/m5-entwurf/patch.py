# -*- coding: utf-8 -*-
# Baut die Referenzfassung von "Ticketkontext aufbereiten":
# verifizierte aktive Version (ce120231) + M-5-Block aus Abschnitt 7.3.
import io, sys

W = r'C:\Users\lis\AppData\Local\Temp\feldpflege'
base = io.open(W + r'\kontext_repo.js', encoding='utf-8').read()
blk = io.open(W + r'\m5_block.js', encoding='utf-8').read().rstrip('\n')

BS = chr(92)
NL = chr(10)

anker = '  if (v.type === "paragraph") s += "' + BS + 'n";' + NL + '  return s;' + NL + '}' + NL
assert base.count(anker) == 1, 'Anker adfText: %d Treffer' % base.count(anker)
neu = base.replace(anker, anker + NL + blk + NL, 1)

esc = '/' + BS + 'n{3,}/g, "' + BS + 'n' + BS + 'n"'          # /\n{3,}/g, "\n\n"
alt_k = 'const text = adfText(c.body).replace(' + esc + ').trim().slice(0, 1500);'
neu_k = 'const text = bereinigeText(adfText(c.body).replace(' + esc + ').trim()).slice(0, 1500);'
assert neu.count(alt_k) == 1, 'Anker Kommentartext: %d Treffer' % neu.count(alt_k)
neu = neu.replace(alt_k, neu_k, 1)

alt_d = 'result.description = adfText(f.description).replace(' + esc + ').trim().slice(0, 4000);'
neu_d = 'result.description = bereinigeText(adfText(f.description).replace(' + esc + ').trim()).slice(0, 4000);'
assert neu.count(alt_d) == 1, 'Anker description: %d Treffer' % neu.count(alt_d)
neu = neu.replace(alt_d, neu_d, 1)

alt_r = 'return [{ json: result }];'
neu_r = ('result.bereinigung = { bereinigt: bereinigtAnzahl, verworfen: verworfenAnzahl, '
         'minRestZeichen: MIN_REST_ZEICHEN, minRestZeichenZitat: MIN_REST_ZEICHEN_ZITAT };'
         + NL + 'return [{ json: result }];')
assert neu.count(alt_r) == 1, 'Anker return: %d Treffer' % neu.count(alt_r)
neu = neu.replace(alt_r, neu_r, 1)

io.open(W + r'\kontext_referenz.js', 'w', encoding='utf-8', newline='').write(neu)

print('Ausgangsversion : %d Zeichen, %d Zeilen' % (len(base), base.count(NL) + 1))
print('Referenzfassung : %d Zeichen, %d Zeilen' % (len(neu), neu.count(NL) + 1))
print('Zuwachs         : %d Zeichen' % (len(neu) - len(base)))

sus = sorted(set(c for c in neu if ord(c) < 0x20 and c != NL) |
             set(c for c in neu if ord(c) > 0x7E))
print('Sonderzeichen   : %s' % ', '.join('%s=%s' % (hex(ord(c)), c) for c in sus))

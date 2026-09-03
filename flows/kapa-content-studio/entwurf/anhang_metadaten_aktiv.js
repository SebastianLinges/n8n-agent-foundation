const item = $input.first();
const bin = item.binary || {};
const names = { img_1x1:'kapa_visual_1x1.png', img_4x5:'kapa_visual_4x5.png', img_9x16:'kapa_visual_9x16.png', img_191x1:'kapa_visual_191x1.png' };
for (const k of Object.keys(names)) { if (bin[k]) { bin[k].fileName = names[k]; bin[k].fileExtension = 'png'; bin[k].mimeType = 'image/png'; } }
return [{ json: item.json, binary: bin }];
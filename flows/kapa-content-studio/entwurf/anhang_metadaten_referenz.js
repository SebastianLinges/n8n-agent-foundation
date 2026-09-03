const item = $input.first();
const bin = item.binary || {};
const names = { img_1x1:'kapa_visual_1x1.png' };
for (const k of Object.keys(names)) { if (bin[k]) { bin[k].fileName = names[k]; bin[k].fileExtension = 'png'; bin[k].mimeType = 'image/png'; } }
return [{ json: item.json, binary: bin }];
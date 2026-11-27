import { PDFDocument, PDFSignature, rgb, StandardFonts } from "pdf-lib";

export function isPng(bytes) {
  return bytes.length > 24 && [137,80,78,71,13,10,26,10].every((byte,i) => bytes[i] === byte);
}

export async function readApprovalPdf(bytes) {
  if (Buffer.from(bytes.subarray(0,5)).toString() !== "%PDF-") throw new Error("invalid_pdf");
  const pdf = await PDFDocument.load(bytes, { updateMetadata: false, throwOnInvalidObject: true });
  if (pdf.getPageCount() < 1 || pdf.getPageCount() > 40) throw new Error("invalid_pdf");
  if (pdf.getForm().getFields().some(field => field instanceof PDFSignature)) throw new Error("invalid_pdf");
  return pdf;
}

export async function createApprovalCopy(source, packet, getAsset) {
  const pdf = await readApprovalPdf(source);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const heading = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([595,842]);
  const ink = rgb(.08,.16,.12);
  const draw = (text,x,y,size=10,bold=false) => page.drawText(text,{x,y,size,font:bold?heading:font,color:ink});
  const putImage = async (path,x,y,width,height) => {
    if (!path) return;
    const image = await pdf.embedPng(await getAsset(path));
    const fit = image.scaleToFit(width,height);
    page.drawImage(image,{x,y:y-fit.height,...fit});
  };
  draw("HOANG LONG  /  DOCUMENT APPROVAL",44,784,18,true);
  draw("Internal approval record. This copy does not carry a certified digital signature.",44,754);
  draw(`Entity: ${packet.seller_id === "hoang-long" ? "Hoang Long" : "Green Hill"}`,44,731);
  draw(`Reference: ${packet.id}`,44,710);
  draw("SHA-256 of the exact source PDF",44,680,10,true);
  draw(packet.source_sha256,44,661,9);
  for (const [index,id] of packet.signer_ids.entries()) {
    const approval = packet.approvals[id];
    const y = 605 - 132 * index;
    draw(`Signer ${index + 1}`,44,y,12,true);
    const name = approval.name.normalize("NFD").replace(/\p{M}/gu,"").replace(/[đĐ]/g,c=>c==="đ"?"d":"D").replace(/[^\x20-\x7e]/g,"").slice(0,68);
    draw(name,44,y-20);
    draw(`Approved: ${approval.at.replace("T"," ").slice(0,19)} UTC`,44,y-40);
    await putImage(approval.path,325,y+4,180,76);
  }
  if (packet.stamp_path) {
    draw("Company stamp (visual)",44,300,12,true);
    await putImage(packet.stamp_path,44,278,130,110);
  }
  draw("Keep the unchanged original PDF with this approval record.",44,88);
  return pdf.save();
}

// House of Hoàng Long · Master Aroma Wheel, bilingual lexicon, edition 02 / 2026.
// Reference vocabulary only; no terms here are verified product or batch claims.
export const AROMA_FAMILIES = [
["floral","Hoa","Floral",1,18,"#d9b7bf"],
["fresh-fruit","Quả tươi","Fresh fruit",19,38,"#e7b2aa"],
["citrus","Cam quýt","Citrus",39,50,"#e9bd80"],
["dried-fruit","Quả khô, chín","Dried & cooked fruit",51,63,"#cda58d"],
["honey","Đường, mật","Sweet & honey",64,77,"#e2cf99"],
["cocoa","Sữa, ca cao","Cream & cocoa",78,88,"#c1a995"],
["vegetal","Rau xanh","Green & vegetal",89,104,"#a4c2ae"],
["herbal","Thảo mộc","Herbal & cooling",105,117,"#9bc2bf"],
["roasted","Rang, ngũ cốc","Roasted & grain",118,133,"#cab390"],
["spice","Gia vị, gỗ","Spice & wood",134,146,"#bea48f"],
["earth","Đất, khoáng","Earth & mineral",147,158,"#afb4a5"],
["smoke","Khói, ủ, men","Smoke, age & ferment",159,173,"#b1adb7"]
].map(([id,vi,en,start,end,color])=>({id,vi,en,start,end,color}));
const PAIRS=`
Jasmine|Hoa nhài;Gardenia|Hoa dành dành;Orange blossom|Hoa cam;Pomelo blossom|Hoa bưởi;Magnolia|Hoa ngọc lan;Lily|Hoa ly;Lotus|Hoa sen;Orchid|Hoa lan;Rose|Hoa hồng;Violet|Hoa violet;Lilac|Hoa tử đinh hương;Lavender|Hoa oải hương;Geranium|Hoa phong lữ;Honeysuckle|Hoa kim ngân;Wildflowers|Hoa dại;Chrysanthemum|Hoa cúc;Osmanthus|Hoa mộc tê;Chamomile|Cúc La Mã;
Green apple|Táo xanh;Red apple|Táo đỏ;Pear|Lê;Peach|Đào;Apricot|Mơ;Plum|Mận;Cherry|Anh đào;Quince|Mộc qua;Lychee|Vải;Longan|Nhãn;Mango|Xoài;Guava|Ổi;Pineapple|Dứa / thơm;Passion fruit|Chanh leo;Jackfruit|Mít;Papaya|Đu đủ;Strawberry|Dâu tây;Raspberry|Mâm xôi đỏ;Blackberry|Mâm xôi đen;Blackcurrant|Lý chua đen;
Orange|Cam;Mandarin|Quýt;Tangerine|Quýt ngọt;Pomelo|Bưởi;Grapefruit|Bưởi chùm;Lemon|Chanh vàng;Lime|Chanh xanh;Kumquat|Quất / tắc;Orange zest|Vỏ cam tươi;Lemon zest|Vỏ chanh vàng;Candied orange peel|Vỏ cam sên;Bergamot|Cam bergamot;
Raisin|Nho khô;Prune|Mận khô;Dried apricot|Mơ khô;Dried fig|Sung khô;Dried longan|Long nhãn;Date|Chà là;Berry jam|Mứt quả mọng;Marmalade|Mứt cam;Stewed pear|Lê nấu;Baked apple|Táo nướng;Wine grape|Nho chín gợi vang;Overripe fruit|Trái cây quá chín;Cider-like|Gợi rượu táo;
Cane sugar|Đường mía;Rock sugar|Đường phèn;Brown sugar|Đường nâu;Caramel|Đường thắng;Molasses|Mật mía;Toffee|Kẹo bơ cứng;Wildflower honey|Mật ong hoa rừng;Longan honey|Mật ong hoa nhãn;Floral nectar|Mật hoa;Beeswax|Sáp ong;Vanilla|Vani;Marshmallow|Kẹo marshmallow;Cotton candy|Kẹo bông;Butterscotch|Kẹo bơ đường nâu;
Milk|Sữa;Cream|Kem sữa;Butter|Bơ;Condensed milk|Sữa đặc;Custard|Kem trứng;Cocoa nib|Hạt ca cao;Dark chocolate|Sô-cô-la đen;Milk chocolate|Sô-cô-la sữa;Roasted cocoa|Ca cao rang;Coconut milk|Nước cốt dừa;Toasted coconut|Dừa rang;
Fresh grass|Cỏ tươi;Cut grass|Cỏ mới cắt;Green leaf|Lá xanh;Crushed herbs|Rau thơm vò;Fresh tea shoot|Búp trà tươi;Cucumber|Dưa chuột;Spinach|Cải bó xôi;Asparagus|Măng tây;Cabbage|Bắp cải;Broccoli|Súp lơ xanh;Celery|Cần tây;Sweet corn|Ngô ngọt;Green bean|Đậu cô ve;Mung bean|Đậu xanh;Soybean|Đậu nành;Green pea|Đậu Hà Lan;
Basil|Húng quế;Mint|Bạc hà;Peppermint|Bạc hà cay;Lemongrass|Sả;Rosemary|Hương thảo;Thyme|Cỏ xạ hương;Eucalyptus|Bạch đàn;Camphor|Long não;Wintergreen|Hương lộc đề;Dried herbs|Thảo mộc khô;Licorice root|Rễ cam thảo;Ginseng|Nhân sâm;Bay leaf|Lá nguyệt quế;
Roasted rice|Gạo rang;Puffed rice|Gạo nổ;Toasted barley|Lúa mạch rang;Malt|Mạch nha;Oats|Yến mạch;Bread crust|Vỏ bánh mì;Chestnut|Hạt dẻ;Hazelnut|Hạt phỉ;Almond|Hạnh nhân;Peanut|Lạc / đậu phộng;Sesame|Vừng / mè;Walnut|Óc chó;Biscuit|Bánh quy;Toast|Bánh mì nướng;Popcorn|Bỏng ngô;Baked pastry|Bánh ngọt nướng;
Cinnamon|Quế;Clove|Đinh hương;Star anise|Hoa hồi;Ginger|Gừng;Nutmeg|Nhục đậu khấu;Cardamom|Bạch đậu khấu;Black pepper|Tiêu đen;White pepper|Tiêu trắng;Cedar|Gỗ tuyết tùng;Sandalwood|Đàn hương;Pine wood|Gỗ thông;Dry wood|Gỗ khô;Tree resin|Nhựa cây;
Forest floor|Nền đất rừng;Wet soil|Đất ướt;Petrichor|Đất sau mưa;Moss|Rêu;Mushroom|Nấm;Dried mushroom|Nấm khô;Wet stone|Đá ướt;Flint|Đá lửa;Chalk-like|Gợi đá phấn;Mineral-like|Gợi khoáng;Fallen leaves|Lá rụng;Wet bark|Vỏ cây ẩm;
Wood smoke|Khói gỗ;Pine smoke|Khói thông;Charcoal|Than củi;Incense|Trầm hương / hương khói;Ash|Tro;Aged wood|Gỗ lâu năm;Leather|Da thuộc;Tobacco leaf|Lá thuốc lá khô;Old paper|Giấy cũ;Antique wood|Gỗ đồ cổ;Yeast|Men bánh mì;Fermented grain|Ngũ cốc lên men;Red wine-like|Gợi vang đỏ;Balsamic|Gợi nhựa thơm;Sourdough-like|Gợi bột chua
`;
export const AROMA_TERMS = PAIRS.trim().split(";").map((entry,index)=>{
const [en,vi]=entry.trim().split("|");
return {id:index+1,en:en.trim(),vi:vi.trim(),familyId:AROMA_FAMILIES.find(group=>group.start<=index+1&&group.end>=index+1)?.id};
});
export function normalizeSensoryTerm(value){return String(value||"").normalize("NFD").toLowerCase().replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d").trim();}
export function findAromaFamilies(notes){
 const given=(Array.isArray(notes)?notes:[]).map(normalizeSensoryTerm).filter(Boolean);
 if(!given.length)return [];
 return AROMA_FAMILIES.filter(group=>AROMA_TERMS.some(term=>term.familyId===group.id&&given.some(note=>{
  const en=normalizeSensoryTerm(term.en),vi=normalizeSensoryTerm(term.vi);
  return note===en||note===vi||((group.id==="smoke"&&(note==="khoi"||note==="smoke"))||(group.id==="honey"&&(note==="mat ong"||note==="honey")));
 }))).map(item=>item.id);
}

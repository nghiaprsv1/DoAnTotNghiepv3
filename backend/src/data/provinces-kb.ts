/**
 * Kho kiến thức 63 tỉnh/thành Việt Nam cho trợ lý AI tra cứu (RAG).
 * Dữ liệu tĩnh, dùng để seed bảng provinces. Nguồn duy nhất cho phần "kiến thức"
 * — LLM chỉ viết câu trả lời từ đây, không tự bịa.
 */
export interface ProvinceKb {
  name: string;
  slug: string;
  region: 'north' | 'central' | 'south';
  knownFor: string;
  bestSeason: string;
  summary: string;
  specialties: string[];
  highlights: string[];
}

export const PROVINCES_KB: ProvinceKb[] = [
  // ─────────────── MIỀN BẮC ───────────────
  {
    name: 'Hà Nội',
    slug: 'ha-noi',
    region: 'north',
    knownFor: 'Thủ đô nghìn năm văn hiến',
    bestSeason: 'Tháng 9-11 (mùa thu) và tháng 3-4',
    summary:
      'Thủ đô của Việt Nam, trung tâm văn hoá - lịch sử với phố cổ, hồ Gươm và ẩm thực đặc sắc. Mùa thu Hà Nội nổi tiếng lãng mạn.',
    specialties: ['Phở', 'Bún chả', 'Cốm làng Vòng', 'Bánh cuốn', 'Cà phê trứng'],
    highlights: ['Hồ Gươm', 'Phố cổ', 'Văn Miếu', 'Lăng Bác', 'Hồ Tây'],
  },
  {
    name: 'Hải Phòng',
    slug: 'hai-phong',
    region: 'north',
    knownFor: 'Thành phố Hoa phượng đỏ, cảng biển lớn',
    bestSeason: 'Tháng 4-10',
    summary:
      'Thành phố cảng lớn nhất miền Bắc, cửa ngõ ra đảo Cát Bà và vịnh Lan Hạ. Nổi tiếng bánh đa cua và hải sản.',
    specialties: ['Bánh đa cua', 'Nem cua bể', 'Bánh mì cay', 'Hải sản Cát Bà'],
    highlights: ['Đảo Cát Bà', 'Vịnh Lan Hạ', 'Đồ Sơn', 'Nhà hát lớn'],
  },
  {
    name: 'Quảng Ninh',
    slug: 'quang-ninh',
    region: 'north',
    knownFor: 'Vịnh Hạ Long - kỳ quan thiên nhiên thế giới',
    bestSeason: 'Tháng 4-6 và tháng 9-11',
    summary:
      'Sở hữu vịnh Hạ Long di sản UNESCO, đảo Cô Tô, Quan Lạn. Điểm đến biển đảo và du thuyền hàng đầu miền Bắc.',
    specialties: ['Chả mực Hạ Long', 'Sá sùng', 'Ngán', 'Bún bề bề'],
    highlights: ['Vịnh Hạ Long', 'Đảo Cô Tô', 'Yên Tử', 'Đảo Quan Lạn', 'Bãi Cháy'],
  },
  {
    name: 'Lào Cai',
    slug: 'lao-cai',
    region: 'north',
    knownFor: 'Sa Pa, ruộng bậc thang, đỉnh Fansipan',
    bestSeason: 'Tháng 9-11 (lúa chín) và tháng 12-2 (săn mây/tuyết)',
    summary:
      'Vùng núi Tây Bắc với thị trấn Sa Pa, đỉnh Fansipan nóc nhà Đông Dương, ruộng bậc thang Mường Hoa và văn hoá dân tộc thiểu số.',
    specialties: ['Thắng cố', 'Cá hồi Sa Pa', 'Lợn cắp nách', 'Rượu táo mèo'],
    highlights: ['Sa Pa', 'Đỉnh Fansipan', 'Bản Cát Cát', 'Thung lũng Mường Hoa'],
  },
  {
    name: 'Hà Giang',
    slug: 'ha-giang',
    region: 'north',
    knownFor: 'Cao nguyên đá Đồng Văn, đèo Mã Pí Lèng',
    bestSeason: 'Tháng 10-12 (hoa tam giác mạch)',
    summary:
      'Cực Bắc Tổ quốc với cao nguyên đá Đồng Văn, đèo Mã Pí Lèng hùng vĩ và mùa hoa tam giác mạch. Thiên đường phượt.',
    specialties: ['Cháo ấu tẩu', 'Thắng dền', 'Bánh cuốn trứng', 'Mèn mén'],
    highlights: ['Cao nguyên đá Đồng Văn', 'Đèo Mã Pí Lèng', 'Cột cờ Lũng Cú', 'Sông Nho Quế'],
  },
  // PLACEHOLDER_NORTH_2
  {
    name: 'Điện Biên',
    slug: 'dien-bien',
    region: 'north',
    knownFor: 'Chiến trường Điện Biên Phủ lịch sử',
    bestSeason: 'Tháng 3 (hoa ban) và tháng 9-10',
    summary:
      'Tỉnh biên giới Tây Bắc gắn với chiến thắng Điện Biên Phủ. Mùa hoa ban trắng và văn hoá dân tộc Thái đặc sắc.',
    specialties: ['Gà nướng', 'Xôi nếp nương', 'Pa pỉnh tộp', 'Rượu sâu chít'],
    highlights: ['Đồi A1', 'Hầm Đờ Cát', 'Mường Phăng', 'Cánh đồng Mường Thanh'],
  },
  {
    name: 'Lai Châu',
    slug: 'lai-chau',
    region: 'north',
    knownFor: 'Núi rừng Tây Bắc hoang sơ, đỉnh Pu Ta Leng',
    bestSeason: 'Tháng 9-11',
    summary:
      'Vùng núi cao hoang sơ với các đỉnh săn mây, bản làng dân tộc và những cung đường đèo hiểm trở ít người biết.',
    specialties: ['Cá bống vùi tro', 'Lam nhọ', 'Rêu đá', 'Ô quẹ'],
    highlights: ['Đỉnh Pu Ta Leng', 'Cao nguyên Sìn Hồ', 'Bản Sin Suối Hồ'],
  },
  {
    name: 'Sơn La',
    slug: 'son-la',
    region: 'north',
    knownFor: 'Cao nguyên Mộc Châu, đồi chè, hoa mận',
    bestSeason: 'Tháng 11-12 (hoa cải) và tháng 1-2 (hoa mận)',
    summary:
      'Cao nguyên Mộc Châu nổi tiếng với đồi chè trái tim, mùa hoa mận - hoa cải, thảo nguyên xanh và sữa bò tươi.',
    specialties: ['Sữa Mộc Châu', 'Bê chao', 'Cá suối', 'Nậm pịa'],
    highlights: ['Cao nguyên Mộc Châu', 'Đồi chè trái tim', 'Thác Dải Yếm', 'Rừng thông Bản Áng'],
  },
  {
    name: 'Hoà Bình',
    slug: 'hoa-binh',
    region: 'north',
    knownFor: 'Thung lũng Mai Châu, văn hoá Mường',
    bestSeason: 'Tháng 9-11',
    summary:
      'Cửa ngõ Tây Bắc với thung lũng Mai Châu thơ mộng, bản Lác, hồ Hoà Bình và văn hoá dân tộc Mường - Thái.',
    specialties: ['Cơm lam', 'Thịt lợn mán', 'Cá nướng sông Đà', 'Rượu cần'],
    highlights: ['Mai Châu', 'Bản Lác', 'Hồ Hoà Bình', 'Suối khoáng Kim Bôi'],
  },
  {
    name: 'Yên Bái',
    slug: 'yen-bai',
    region: 'north',
    knownFor: 'Ruộng bậc thang Mù Cang Chải',
    bestSeason: 'Tháng 9-10 (lúa chín)',
    summary:
      'Nổi tiếng với ruộng bậc thang Mù Cang Chải - di sản quốc gia, mùa nước đổ và mùa lúa chín vàng rực.',
    specialties: ['Cốm Tú Lệ', 'Cá hồ Thác Bà', 'Gà đồi', 'Táo mèo'],
    highlights: ['Mù Cang Chải', 'Đèo Khau Phạ', 'Hồ Thác Bà', 'Tú Lệ'],
  },
  {
    name: 'Lạng Sơn',
    slug: 'lang-son',
    region: 'north',
    knownFor: 'Xứ Lạng, ải Chi Lăng, chợ biên giới',
    bestSeason: 'Tháng 9-11',
    summary:
      'Tỉnh biên giới phía Bắc với động Tam Thanh, núi Tô Thị, chợ Đông Kinh và ẩm thực vịt quay nổi tiếng.',
    specialties: ['Vịt quay', 'Phở chua', 'Khâu nhục', 'Bánh cuốn trứng'],
    highlights: ['Động Tam Thanh', 'Núi Mẫu Sơn', 'Ải Chi Lăng', 'Chợ Đông Kinh'],
  },
  {
    name: 'Cao Bằng',
    slug: 'cao-bang',
    region: 'north',
    knownFor: 'Thác Bản Giốc, di tích Pác Bó',
    bestSeason: 'Tháng 9-10 và tháng 11-12',
    summary:
      'Vùng non nước hữu tình với thác Bản Giốc hùng vĩ, động Ngườm Ngao và khu di tích lịch sử Pác Bó.',
    specialties: ['Bánh cuốn canh', 'Vịt quay 7 vị', 'Hạt dẻ Trùng Khánh', 'Phở chua'],
    highlights: ['Thác Bản Giốc', 'Động Ngườm Ngao', 'Pác Bó', 'Hồ Thang Hen'],
  },
  {
    name: 'Bắc Kạn',
    slug: 'bac-kan',
    region: 'north',
    knownFor: 'Hồ Ba Bể - hồ nước ngọt tự nhiên lớn nhất',
    bestSeason: 'Tháng 4-10',
    summary:
      'Tỉnh miền núi yên bình với hồ Ba Bể - một trong những hồ nước ngọt tự nhiên đẹp nhất thế giới, giữa vườn quốc gia.',
    specialties: ['Tôm chua', 'Cá nướng Ba Bể', 'Bánh gio', 'Miến dong'],
    highlights: ['Hồ Ba Bể', 'Động Puông', 'Thác Đầu Đẳng', 'Ao Tiên'],
  },
  // PLACEHOLDER_NORTH_3
  {
    name: 'Thái Nguyên',
    slug: 'thai-nguyen',
    region: 'north',
    knownFor: 'Đệ nhất danh trà, hồ Núi Cốc',
    bestSeason: 'Tháng 4-10',
    summary:
      'Thủ phủ chè Việt Nam với những đồi chè Tân Cương xanh mướt và hồ Núi Cốc thơ mộng gắn liền truyền thuyết.',
    specialties: ['Trà Tân Cương', 'Cơm lam', 'Bánh chưng Bờ Đậu', 'Nem chua'],
    highlights: ['Đồi chè Tân Cương', 'Hồ Núi Cốc', 'Hang Phượng Hoàng', 'ATK Định Hoá'],
  },
  {
    name: 'Tuyên Quang',
    slug: 'tuyen-quang',
    region: 'north',
    knownFor: 'Thủ đô kháng chiến, suối khoáng Mỹ Lâm',
    bestSeason: 'Tháng 8-9 (Lễ hội Thành Tuyên)',
    summary:
      'Vùng đất cách mạng Tân Trào, nổi tiếng Lễ hội Thành Tuyên với đèn lồng khổng lồ và suối khoáng nóng Mỹ Lâm.',
    specialties: ['Gỏi cá bỗng', 'Bánh gai Chiêm Hoá', 'Thịt trâu khô', 'Rượu ngô'],
    highlights: ['Tân Trào', 'Suối khoáng Mỹ Lâm', 'Thác Mơ Na Hang', 'Hồ Na Hang'],
  },
  {
    name: 'Phú Thọ',
    slug: 'phu-tho',
    region: 'north',
    knownFor: 'Đất Tổ Hùng Vương, đền Hùng',
    bestSeason: 'Tháng 3 âm lịch (Giỗ Tổ)',
    summary:
      'Cội nguồn dân tộc với khu di tích đền Hùng, hát Xoan di sản UNESCO và vườn quốc gia Xuân Sơn.',
    specialties: ['Thịt chua Thanh Sơn', 'Bưởi Đoan Hùng', 'Cọ ỏm', 'Bánh tai'],
    highlights: ['Đền Hùng', 'Vườn quốc gia Xuân Sơn', 'Đầm Ao Châu'],
  },
  {
    name: 'Vĩnh Phúc',
    slug: 'vinh-phuc',
    region: 'north',
    knownFor: 'Khu nghỉ mát Tam Đảo, Đại Lải',
    bestSeason: 'Tháng 4-9',
    summary:
      'Nổi tiếng thị trấn Tam Đảo trong mây mát mẻ quanh năm, hồ Đại Lải và thiền viện Trúc Lâm Tây Thiên.',
    specialties: ['Su su Tam Đảo', 'Gà đồi', 'Bò tái kiến đốt', 'Cá thính'],
    highlights: ['Tam Đảo', 'Hồ Đại Lải', 'Tây Thiên', 'Thác Bạc'],
  },
  {
    name: 'Bắc Giang',
    slug: 'bac-giang',
    region: 'north',
    knownFor: 'Vải thiều Lục Ngạn, chùa Vĩnh Nghiêm',
    bestSeason: 'Tháng 6 (mùa vải)',
    summary:
      'Vùng đất vải thiều Lục Ngạn nổi tiếng, có chùa Vĩnh Nghiêm lưu giữ mộc bản di sản và rừng nguyên sinh Tây Yên Tử.',
    specialties: ['Vải thiều Lục Ngạn', 'Bánh đa Kế', 'Mỳ Chũ', 'Gà đồi Yên Thế'],
    highlights: ['Chùa Vĩnh Nghiêm', 'Tây Yên Tử', 'Hồ Cấm Sơn', 'Suối Mỡ'],
  },
  {
    name: 'Bắc Ninh',
    slug: 'bac-ninh',
    region: 'north',
    knownFor: 'Quê hương quan họ, chùa cổ',
    bestSeason: 'Tháng 1-3 (mùa lễ hội)',
    summary:
      'Cái nôi của dân ca quan họ di sản UNESCO, nhiều chùa cổ và làng nghề tranh Đông Hồ truyền thống.',
    specialties: ['Bánh phu thê', 'Nem Bùi', 'Bánh tẻ', 'Cháo cá Tích Nghi'],
    highlights: ['Chùa Dâu', 'Chùa Bút Tháp', 'Làng tranh Đông Hồ', 'Đền Đô'],
  },
  {
    name: 'Hải Dương',
    slug: 'hai-duong',
    region: 'north',
    knownFor: 'Côn Sơn - Kiếp Bạc, bánh đậu xanh',
    bestSeason: 'Tháng 8-10',
    summary:
      'Vùng đất văn hiến với khu di tích Côn Sơn - Kiếp Bạc, đảo Cò Chi Lăng Nam và đặc sản bánh đậu xanh trứ danh.',
    specialties: ['Bánh đậu xanh', 'Bánh gai Ninh Giang', 'Vải Thanh Hà', 'Rươi'],
    highlights: ['Côn Sơn - Kiếp Bạc', 'Đảo Cò', 'Văn miếu Mao Điền'],
  },
  {
    name: 'Hưng Yên',
    slug: 'hung-yen',
    region: 'north',
    knownFor: 'Phố Hiến cổ, nhãn lồng',
    bestSeason: 'Tháng 7-8 (mùa nhãn)',
    summary:
      'Phố Hiến từng là thương cảng sầm uất, nay lưu giữ nhiều đền chùa cổ và nổi tiếng đặc sản nhãn lồng tiến vua.',
    specialties: ['Nhãn lồng', 'Gà Đông Tảo', 'Bún thang lươn', 'Chả gà Tiểu Quan'],
    highlights: ['Phố Hiến', 'Đền Chử Đồng Tử', 'Chùa Chuông'],
  },
  {
    name: 'Hà Nam',
    slug: 'ha-nam',
    region: 'north',
    knownFor: 'Chùa Tam Chúc, Kẽm Trống',
    bestSeason: 'Tháng 1-3 (lễ hội)',
    summary:
      'Nổi tiếng quần thể chùa Tam Chúc rộng lớn bên hồ, làng kho cá Vũ Đại và phong cảnh non nước hữu tình.',
    specialties: ['Cá kho Vũ Đại', 'Bánh cuốn Phủ Lý', 'Chuối ngự', 'Rượu Vọc'],
    highlights: ['Chùa Tam Chúc', 'Kẽm Trống', 'Đền Trần Thương'],
  },
  {
    name: 'Nam Định',
    slug: 'nam-dinh',
    region: 'north',
    knownFor: 'Đền Trần, nhà thờ cổ, phở',
    bestSeason: 'Tháng 1 (khai ấn đền Trần)',
    summary:
      'Đất học với đền Trần lễ khai ấn, nhiều nhà thờ kiến trúc Gothic, biển Thịnh Long và quê hương phở Việt.',
    specialties: ['Phở bò Nam Định', 'Bánh cuốn làng Kênh', 'Nem nắm Giao Thuỷ', 'Bánh xíu páo'],
    highlights: ['Đền Trần', 'Nhà thờ Bùi Chu', 'Biển Thịnh Long', 'Vườn quốc gia Xuân Thuỷ'],
  },
  {
    name: 'Thái Bình',
    slug: 'thai-binh',
    region: 'north',
    knownFor: 'Quê lúa, chùa Keo, biển Cồn Vành',
    bestSeason: 'Tháng 4-9',
    summary:
      'Vùng đồng bằng quê lúa thanh bình với chùa Keo kiến trúc gỗ độc đáo, biển Cồn Vành và làng vườn Bách Thuận.',
    specialties: ['Bánh cáy', 'Canh cá Quỳnh Côi', 'Gỏi nhệch', 'Nem chạo'],
    highlights: ['Chùa Keo', 'Biển Cồn Vành', 'Đền Tiên La', 'Làng vườn Bách Thuận'],
  },
  {
    name: 'Ninh Bình',
    slug: 'ninh-binh',
    region: 'north',
    knownFor: 'Tràng An, Tam Cốc - "Hạ Long trên cạn"',
    bestSeason: 'Tháng 5-6 (lúa chín Tam Cốc) và tháng 1-3',
    summary:
      'Di sản kép Tràng An với hang động, sông nước và núi đá vôi tuyệt đẹp. Có cố đô Hoa Lư, chùa Bái Đính lớn nhất Đông Nam Á.',
    specialties: ['Cơm cháy', 'Thịt dê núi', 'Ốc núi', 'Miến lươn'],
    highlights: ['Tràng An', 'Tam Cốc - Bích Động', 'Chùa Bái Đính', 'Hang Múa', 'Cố đô Hoa Lư'],
  },
  // PLACEHOLDER_CENTRAL
  {
    name: 'Thanh Hoá',
    slug: 'thanh-hoa',
    region: 'central',
    knownFor: 'Biển Sầm Sơn, suối cá thần',
    bestSeason: 'Tháng 4-8',
    summary:
      'Tỉnh lớn cửa ngõ miền Trung với bãi biển Sầm Sơn nổi tiếng, thành nhà Hồ di sản UNESCO và suối cá thần Cẩm Lương kỳ lạ.',
    specialties: ['Nem chua Thanh Hoá', 'Bánh gai Tứ Trụ', 'Gỏi cá nhệch', 'Chè lam Phủ Quảng'],
    highlights: ['Biển Sầm Sơn', 'Thành nhà Hồ', 'Suối cá thần Cẩm Lương', 'Pù Luông'],
  },
  {
    name: 'Nghệ An',
    slug: 'nghe-an',
    region: 'central',
    knownFor: 'Quê Bác, biển Cửa Lò',
    bestSeason: 'Tháng 4-8',
    summary:
      'Quê hương Chủ tịch Hồ Chí Minh với khu di tích Kim Liên, bãi biển Cửa Lò và vườn quốc gia Pù Mát.',
    specialties: ['Cháo lươn', 'Bánh mướt', 'Cam Vinh', 'Nhút Thanh Chương'],
    highlights: ['Quê Bác (Kim Liên)', 'Biển Cửa Lò', 'Vườn quốc gia Pù Mát', 'Đảo Lan Châu'],
  },
  {
    name: 'Hà Tĩnh',
    slug: 'ha-tinh',
    region: 'central',
    knownFor: 'Biển Thiên Cầm, chùa Hương Tích',
    bestSeason: 'Tháng 4-8',
    summary:
      'Vùng đất hiếu học với bãi biển Thiên Cầm, chùa Hương Tích "Hoan Châu đệ nhất danh lam" và khu lưu niệm Nguyễn Du.',
    specialties: ['Kẹo cu đơ', 'Bánh đa vừng', 'Hến sông La', 'Ram bánh mướt'],
    highlights: ['Biển Thiên Cầm', 'Chùa Hương Tích', 'Khu lưu niệm Nguyễn Du', 'Hồ Kẻ Gỗ'],
  },
  {
    name: 'Quảng Bình',
    slug: 'quang-binh',
    region: 'central',
    knownFor: 'Phong Nha - Kẻ Bàng, hang Sơn Đoòng',
    bestSeason: 'Tháng 3-8',
    summary:
      'Vương quốc hang động với Phong Nha - Kẻ Bàng di sản UNESCO, hang Sơn Đoòng lớn nhất thế giới và biển Nhật Lệ.',
    specialties: ['Cháo canh', 'Bánh bột lọc', 'Khoai deo', 'Hải sản Nhật Lệ'],
    highlights: ['Động Phong Nha', 'Hang Sơn Đoòng', 'Động Thiên Đường', 'Biển Nhật Lệ', 'Suối Moọc'],
  },
  {
    name: 'Quảng Trị',
    slug: 'quang-tri',
    region: 'central',
    knownFor: 'Di tích chiến tranh, địa đạo Vịnh Mốc',
    bestSeason: 'Tháng 3-8',
    summary:
      'Vùng đất lịch sử với thành cổ Quảng Trị, cầu Hiền Lương - sông Bến Hải, địa đạo Vịnh Mốc và biển Cửa Tùng.',
    specialties: ['Bún hến Mai Xá', 'Cháo vạt giường', 'Bánh ướt Phương Lang', 'Nem chợ Sãi'],
    highlights: ['Thành cổ Quảng Trị', 'Địa đạo Vịnh Mốc', 'Cầu Hiền Lương', 'Đảo Cồn Cỏ'],
  },
  {
    name: 'Thừa Thiên Huế',
    slug: 'thua-thien-hue',
    region: 'central',
    knownFor: 'Cố đô Huế, quần thể di tích triều Nguyễn',
    bestSeason: 'Tháng 1-4',
    summary:
      'Cố đô triều Nguyễn với Đại Nội, lăng tẩm vua, chùa Thiên Mụ và sông Hương thơ mộng. Di sản văn hoá UNESCO, kinh đô ẩm thực.',
    specialties: ['Bún bò Huế', 'Cơm hến', 'Bánh bèo nậm lọc', 'Chè Huế'],
    highlights: ['Đại Nội', 'Lăng Khải Định', 'Chùa Thiên Mụ', 'Sông Hương', 'Biển Lăng Cô'],
  },
  {
    name: 'Đà Nẵng',
    slug: 'da-nang',
    region: 'central',
    knownFor: 'Thành phố đáng sống, cầu Rồng, Bà Nà',
    bestSeason: 'Tháng 2-8',
    summary:
      'Thành phố biển hiện đại với bãi Mỹ Khê, Bà Nà Hills - Cầu Vàng, bán đảo Sơn Trà và cầu Rồng phun lửa. Trung tâm du lịch miền Trung.',
    specialties: ['Mì Quảng', 'Bánh tráng cuốn thịt heo', 'Bún chả cá', 'Hải sản'],
    highlights: ['Bà Nà Hills - Cầu Vàng', 'Bãi biển Mỹ Khê', 'Bán đảo Sơn Trà', 'Ngũ Hành Sơn', 'Cầu Rồng'],
  },
  {
    name: 'Quảng Nam',
    slug: 'quang-nam',
    region: 'central',
    knownFor: 'Phố cổ Hội An, thánh địa Mỹ Sơn',
    bestSeason: 'Tháng 2-8',
    summary:
      'Hai di sản UNESCO: phố cổ Hội An đèn lồng lung linh và thánh địa Mỹ Sơn của người Chăm. Có đảo Cù Lao Chàm và rừng dừa Bảy Mẫu.',
    specialties: ['Cao lầu', 'Mì Quảng', 'Cơm gà Hội An', 'Bánh mì Phượng'],
    highlights: ['Phố cổ Hội An', 'Thánh địa Mỹ Sơn', 'Cù Lao Chàm', 'Rừng dừa Bảy Mẫu'],
  },
  {
    name: 'Quảng Ngãi',
    slug: 'quang-ngai',
    region: 'central',
    knownFor: 'Đảo Lý Sơn - vương quốc tỏi',
    bestSeason: 'Tháng 4-8',
    summary:
      'Nổi tiếng đảo Lý Sơn với cảnh quan núi lửa, cánh đồng tỏi và biển trong xanh. Có di chỉ văn hoá Sa Huỳnh cổ.',
    specialties: ['Tỏi Lý Sơn', 'Don', 'Cá bống sông Trà', 'Kẹo gương'],
    highlights: ['Đảo Lý Sơn', 'Biển Sa Huỳnh', 'Núi Thiên Ấn', 'Mũi Ba Làng An'],
  },
  {
    name: 'Bình Định',
    slug: 'binh-dinh',
    region: 'central',
    knownFor: 'Quy Nhơn, Eo Gió, Kỳ Co',
    bestSeason: 'Tháng 3-8',
    summary:
      'Thành phố biển Quy Nhơn với Eo Gió, Kỳ Co nước trong như ngọc, tháp Chăm cổ và là đất võ - quê hương Tây Sơn.',
    specialties: ['Bún chả cá Quy Nhơn', 'Bánh ít lá gai', 'Nem chợ Huyện', 'Bún song thằn'],
    highlights: ['Eo Gió', 'Kỳ Co', 'Tháp Đôi', 'Ghềnh Ráng - Tiên Sa', 'Cù Lao Xanh'],
  },
  {
    name: 'Phú Yên',
    slug: 'phu-yen',
    region: 'central',
    knownFor: 'Gành Đá Đĩa, "xứ hoa vàng cỏ xanh"',
    bestSeason: 'Tháng 3-8',
    summary:
      'Vẻ đẹp hoang sơ với Gành Đá Đĩa độc đáo, Mũi Điện đón bình minh đầu tiên, đầm Ô Loan và bãi Xép.',
    specialties: ['Mắt cá ngừ đại dương', 'Bánh canh hẹ', 'Sò huyết Ô Loan', 'Cá ngừ đại dương'],
    highlights: ['Gành Đá Đĩa', 'Mũi Điện (Đại Lãnh)', 'Bãi Xép', 'Đầm Ô Loan', 'Tháp Nhạn'],
  },
  // PLACEHOLDER_CENTRAL_2
  {
    name: 'Khánh Hoà',
    slug: 'khanh-hoa',
    region: 'central',
    knownFor: 'Nha Trang - thiên đường biển đảo',
    bestSeason: 'Tháng 3-8',
    summary:
      'Thành phố biển Nha Trang với vịnh đẹp, các đảo, lặn ngắm san hô, tắm bùn khoáng và VinWonders. Có vịnh Vân Phong và Cam Ranh.',
    specialties: ['Bún cá Nha Trang', 'Nem nướng Ninh Hoà', 'Bánh căn', 'Yến sào'],
    highlights: ['Vịnh Nha Trang', 'VinWonders Hòn Tre', 'Tháp Bà Ponagar', 'Đảo Bình Ba', 'Bãi Dài'],
  },
  {
    name: 'Ninh Thuận',
    slug: 'ninh-thuan',
    region: 'central',
    knownFor: 'Vịnh Vĩnh Hy, đồng cừu, tháp Chăm',
    bestSeason: 'Tháng 12-8',
    summary:
      'Vùng nắng gió với vịnh Vĩnh Hy đẹp top Việt Nam, đồng cừu An Hoà, vườn nho và các tháp Chăm Pô Klong Garai cổ kính.',
    specialties: ['Thịt cừu', 'Nho Ninh Thuận', 'Bánh canh chả cá', 'Nước mắm Cà Ná'],
    highlights: ['Vịnh Vĩnh Hy', 'Đồng cừu An Hoà', 'Tháp Pô Klong Garai', 'Hang Rái', 'Vườn nho'],
  },
  {
    name: 'Bình Thuận',
    slug: 'binh-thuan',
    region: 'central',
    knownFor: 'Mũi Né, đồi cát bay, Phan Thiết',
    bestSeason: 'Tháng 11-4',
    summary:
      'Thủ phủ resort Mũi Né với đồi cát bay, suối Tiên, làng chài và bãi đá Ông Địa. Có đảo Phú Quý hoang sơ.',
    specialties: ['Nước mắm Phan Thiết', 'Bánh căn', 'Gỏi cá mai', 'Lẩu thả'],
    highlights: ['Đồi cát bay Mũi Né', 'Bàu Trắng', 'Suối Tiên', 'Đảo Phú Quý', 'Tháp Po Sah Inư'],
  },
  {
    name: 'Kon Tum',
    slug: 'kon-tum',
    region: 'central',
    knownFor: 'Nhà thờ gỗ, Măng Đen "Đà Lạt thứ hai"',
    bestSeason: 'Tháng 11-4',
    summary:
      'Vùng Tây Nguyên với nhà thờ gỗ trăm tuổi, thị trấn Măng Đen mát lạnh giữa rừng thông và văn hoá nhà rông Ba Na.',
    specialties: ['Gỏi lá', 'Cá tầm Măng Đen', 'Heo rẫy nướng', 'Rượu cần'],
    highlights: ['Nhà thờ gỗ Kon Tum', 'Măng Đen', 'Cầu treo Kon Klor', 'Nhà rông'],
  },
  {
    name: 'Gia Lai',
    slug: 'gia-lai',
    region: 'central',
    knownFor: 'Biển Hồ Pleiku, núi lửa Chư Đăng Ya',
    bestSeason: 'Tháng 11-12 (hoa dã quỳ)',
    summary:
      'Cao nguyên Pleiku với Biển Hồ trong xanh "đôi mắt Pleiku", núi lửa Chư Đăng Ya phủ hoa dã quỳ và đồi chè.',
    specialties: ['Phở khô Gia Lai', 'Bún mắm cua', 'Cà phê', 'Muối kiến vàng'],
    highlights: ['Biển Hồ', 'Núi lửa Chư Đăng Ya', 'Thác Phú Cường', 'Đồi chè Biển Hồ'],
  },
  {
    name: 'Đắk Lắk',
    slug: 'dak-lak',
    region: 'central',
    knownFor: 'Thủ phủ cà phê, Buôn Ma Thuột, voi',
    bestSeason: 'Tháng 11-4',
    summary:
      'Trung tâm Tây Nguyên và thủ phủ cà phê Việt Nam, với hồ Lắk, thác Dray Nur hùng vĩ và văn hoá cồng chiêng, cưỡi voi.',
    specialties: ['Cà phê Buôn Ma Thuột', 'Bún đỏ', 'Gà nướng Bản Đôn', 'Cơm lam'],
    highlights: ['Hồ Lắk', 'Thác Dray Nur', 'Buôn Đôn', 'Bảo tàng cà phê'],
  },
  {
    name: 'Đắk Nông',
    slug: 'dak-nong',
    region: 'central',
    knownFor: 'Công viên địa chất toàn cầu, hang núi lửa',
    bestSeason: 'Tháng 11-4',
    summary:
      'Sở hữu công viên địa chất toàn cầu UNESCO với hệ thống hang động núi lửa dài nhất Đông Nam Á và hồ Tà Đùng "vịnh Hạ Long Tây Nguyên".',
    specialties: ['Cà phê', 'Cá lăng', 'Canh thụt', 'Rượu cần'],
    highlights: ['Hồ Tà Đùng', 'Hang động núi lửa Krông Nô', 'Thác Đắk G\'lun', 'Thác Liêng Nung'],
  },
  {
    name: 'Lâm Đồng',
    slug: 'lam-dong',
    region: 'central',
    knownFor: 'Đà Lạt - thành phố ngàn hoa',
    bestSeason: 'Quanh năm, đẹp nhất tháng 10-3',
    summary:
      'Đà Lạt mộng mơ giữa cao nguyên Lâm Viên với khí hậu mát mẻ, hồ Xuân Hương, thung lũng hoa, đồi chè và rừng thông.',
    specialties: ['Bánh tráng nướng', 'Lẩu gà lá é', 'Atisô', 'Dâu tây', 'Sữa đậu nành'],
    highlights: ['Hồ Xuân Hương', 'Thung lũng Tình Yêu', 'Langbiang', 'Thiền viện Trúc Lâm', 'Đồi chè Cầu Đất'],
  },
  // PLACEHOLDER_SOUTH
  {
    name: 'TP. Hồ Chí Minh',
    slug: 'ho-chi-minh',
    region: 'south',
    knownFor: 'Đô thị lớn nhất, "Hòn ngọc Viễn Đông"',
    bestSeason: 'Tháng 12-4 (mùa khô)',
    summary:
      'Thành phố sôi động nhất Việt Nam với chợ Bến Thành, nhà thờ Đức Bà, phố đi bộ Nguyễn Huệ, địa đạo Củ Chi và ẩm thực đa dạng.',
    specialties: ['Cơm tấm', 'Hủ tiếu', 'Bánh mì Sài Gòn', 'Cà phê sữa đá'],
    highlights: ['Chợ Bến Thành', 'Nhà thờ Đức Bà', 'Dinh Độc Lập', 'Địa đạo Củ Chi', 'Phố đi bộ Nguyễn Huệ'],
  },
  {
    name: 'Bà Rịa - Vũng Tàu',
    slug: 'ba-ria-vung-tau',
    region: 'south',
    knownFor: 'Biển Vũng Tàu, Côn Đảo',
    bestSeason: 'Tháng 11-4',
    summary:
      'Thành phố biển gần Sài Gòn với tượng Chúa Kitô, ngọn hải đăng và đặc biệt là Côn Đảo hoang sơ - thiên đường biển và di tích lịch sử.',
    specialties: ['Bánh khọt Vũng Tàu', 'Hải sản', 'Bánh hỏi An Nhứt', 'Lẩu cá đuối'],
    highlights: ['Côn Đảo', 'Tượng Chúa Kitô', 'Bãi Sau', 'Hải đăng Vũng Tàu', 'Hồ Mây'],
  },
  {
    name: 'Đồng Nai',
    slug: 'dong-nai',
    region: 'south',
    knownFor: 'Vườn quốc gia Cát Tiên, thác Giang Điền',
    bestSeason: 'Tháng 12-4',
    summary:
      'Cửa ngõ Đông Nam Bộ với vườn quốc gia Cát Tiên đa dạng sinh học, thác Giang Điền và núi Chứa Chan.',
    specialties: ['Gỏi cá Biên Hoà', 'Dơi xào', 'Bưởi Tân Triều', 'Lẩu lá rừng'],
    highlights: ['Vườn quốc gia Cát Tiên', 'Thác Giang Điền', 'Núi Chứa Chan', 'Làng bưởi Tân Triều'],
  },
  {
    name: 'Bình Dương',
    slug: 'binh-duong',
    region: 'south',
    knownFor: 'Làng nghề gốm sứ, khu du lịch Đại Nam',
    bestSeason: 'Tháng 12-4',
    summary:
      'Trung tâm công nghiệp với khu du lịch Đại Nam quy mô lớn, chùa Bà Thiên Hậu và các làng nghề gốm sứ, sơn mài truyền thống.',
    specialties: ['Gỏi gà măng cụt', 'Bánh bèo bì', 'Măng cụt Lái Thiêu', 'Nem Lái Thiêu'],
    highlights: ['Khu du lịch Đại Nam', 'Chùa Bà Thiên Hậu', 'Làng gốm Tân Phước Khánh'],
  },
  {
    name: 'Bình Phước',
    slug: 'binh-phuoc',
    region: 'south',
    knownFor: 'Trảng cỏ Bù Lạch, sóc Bom Bo',
    bestSeason: 'Tháng 11-4',
    summary:
      'Vùng đất đỏ bazan với trảng cỏ Bù Lạch, vườn quốc gia Bù Gia Mập và di tích sóc Bom Bo gắn với văn hoá S\'tiêng.',
    specialties: ['Hạt điều Bình Phước', 'Đọt mây nướng', 'Cơm lam', 'Gà nướng'],
    highlights: ['Trảng cỏ Bù Lạch', 'Vườn quốc gia Bù Gia Mập', 'Sóc Bom Bo', 'Núi Bà Rá'],
  },
  {
    name: 'Tây Ninh',
    slug: 'tay-ninh',
    region: 'south',
    knownFor: 'Núi Bà Đen, toà thánh Cao Đài',
    bestSeason: 'Tháng 11-4',
    summary:
      'Nổi tiếng núi Bà Đen "nóc nhà Nam Bộ" với cáp treo và tượng Phật, toà thánh Cao Đài độc đáo và hồ Dầu Tiếng.',
    specialties: ['Bánh tráng phơi sương Trảng Bàng', 'Bánh canh Trảng Bàng', 'Muối tôm', 'Bò tơ'],
    highlights: ['Núi Bà Đen', 'Toà thánh Cao Đài', 'Hồ Dầu Tiếng', 'Vườn quốc gia Lò Gò - Xa Mát'],
  },
  // PLACEHOLDER_SOUTH_MEKONG
  {
    name: 'Long An',
    slug: 'long-an',
    region: 'south',
    knownFor: 'Cửa ngõ miền Tây, làng nổi Tân Lập',
    bestSeason: 'Tháng 9-11 (mùa nước nổi)',
    summary:
      'Cửa ngõ Đồng bằng sông Cửu Long với làng nổi Tân Lập rừng tràm xanh mát, khu Đồng Tháp Mười và cánh đồng bất tận.',
    specialties: ['Gạo nàng thơm Chợ Đào', 'Canh chua cá', 'Lẩu mắm', 'Đậu phộng Đức Hoà'],
    highlights: ['Làng nổi Tân Lập', 'Khu Đồng Tháp Mười', 'Nhà trăm cột'],
  },
  {
    name: 'Tiền Giang',
    slug: 'tien-giang',
    region: 'south',
    knownFor: 'Chợ nổi Cái Bè, cù lao Thới Sơn',
    bestSeason: 'Tháng 12-4',
    summary:
      'Miền sông nước với chợ nổi Cái Bè, cù lao Thới Sơn miệt vườn, biển Tân Thành và trại rắn Đồng Tâm.',
    specialties: ['Hủ tiếu Mỹ Tho', 'Vú sữa Lò Rèn', 'Mắm tôm chà', 'Bánh giá Chợ Giồng'],
    highlights: ['Chợ nổi Cái Bè', 'Cù lao Thới Sơn', 'Chùa Vĩnh Tràng', 'Biển Tân Thành'],
  },
  {
    name: 'Bến Tre',
    slug: 'ben-tre',
    region: 'south',
    knownFor: 'Xứ dừa, miệt vườn sông nước',
    bestSeason: 'Tháng 12-4',
    summary:
      'Quê hương xứ dừa với những con rạch rợp bóng dừa, đi xuồng ba lá, lò kẹo dừa và trải nghiệm miệt vườn đặc trưng Nam Bộ.',
    specialties: ['Kẹo dừa', 'Đuông dừa', 'Cá lóc nướng trui', 'Chuột dừa'],
    highlights: ['Cồn Phụng', 'Cồn Quy', 'Vườn dừa', 'Sân chim Vàm Hồ'],
  },
  {
    name: 'Vĩnh Long',
    slug: 'vinh-long',
    region: 'south',
    knownFor: 'Cù lao An Bình, lò gạch, homestay miệt vườn',
    bestSeason: 'Tháng 12-4',
    summary:
      'Trung tâm miệt vườn sông nước với cù lao An Bình trĩu quả, vương quốc lò gạch - gốm Mang Thít và homestay nhà vườn.',
    specialties: ['Cá tai tượng chiên xù', 'Bưởi Năm Roi', 'Khoai lang Bình Tân', 'Bánh tráng cù lao Mây'],
    highlights: ['Cù lao An Bình', 'Lò gạch Mang Thít', 'Chợ nổi Trà Ôn', 'Văn Thánh Miếu'],
  },
  {
    name: 'Trà Vinh',
    slug: 'tra-vinh',
    region: 'south',
    knownFor: 'Chùa Khmer, ao Bà Om',
    bestSeason: 'Tháng 12-4',
    summary:
      'Vùng đất văn hoá Khmer với hơn 140 ngôi chùa cổ kính, ao Bà Om huyền thoại và biển Ba Động, cù lao Long Trị.',
    specialties: ['Bún nước lèo', 'Bánh canh Bến Có', 'Dừa sáp Cầu Kè', 'Cốm dẹp'],
    highlights: ['Ao Bà Om', 'Chùa Âng', 'Biển Ba Động', 'Cù lao Long Trị'],
  },
  {
    name: 'Đồng Tháp',
    slug: 'dong-thap',
    region: 'south',
    knownFor: 'Vườn quốc gia Tràm Chim, làng hoa Sa Đéc',
    bestSeason: 'Tháng 12-4 (hoa) và tháng 9-11 (sen, nước nổi)',
    summary:
      'Đất sen hồng với vườn quốc gia Tràm Chim chim sếu quý, làng hoa Sa Đéc rực rỡ và khu di tích Gò Tháp.',
    specialties: ['Hủ tiếu Sa Đéc', 'Sen các loại', 'Cá lóc nướng', 'Chuột đồng quay lu'],
    highlights: ['Vườn quốc gia Tràm Chim', 'Làng hoa Sa Đéc', 'Khu Xẻo Quýt', 'Gáo Giồng'],
  },
  // PLACEHOLDER_SOUTH_MEKONG_2
  {
    name: 'An Giang',
    slug: 'an-giang',
    region: 'south',
    knownFor: 'Rừng tràm Trà Sư, núi Cấm, mùa nước nổi',
    bestSeason: 'Tháng 9-11 (nước nổi) và tháng 4 (lễ Bà Chúa Xứ)',
    summary:
      'Vùng Bảy Núi linh thiêng với rừng tràm Trà Sư xanh ngắt, núi Cấm "nóc nhà miền Tây", miếu Bà Chúa Xứ và cánh đồng Tà Pạ.',
    specialties: ['Bún cá Châu Đốc', 'Mắm Châu Đốc', 'Bò bảy món Núi Sam', 'Bánh bò thốt nốt'],
    highlights: ['Rừng tràm Trà Sư', 'Núi Cấm', 'Miếu Bà Chúa Xứ', 'Cánh đồng Tà Pạ', 'Làng Chăm Châu Giang'],
  },
  {
    name: 'Kiên Giang',
    slug: 'kien-giang',
    region: 'south',
    knownFor: 'Đảo ngọc Phú Quốc, Hà Tiên',
    bestSeason: 'Tháng 11-4',
    summary:
      'Sở hữu đảo Phú Quốc thiên đường biển đảo với bãi Sao, cáp treo Hòn Thơm, chợ đêm và nước mắm. Có Hà Tiên thơ mộng và quần đảo Nam Du.',
    specialties: ['Nước mắm Phú Quốc', 'Bún kèn', 'Gỏi cá trích', 'Hải sản', 'Cà phê sỏi'],
    highlights: ['Phú Quốc', 'Bãi Sao', 'Cáp treo Hòn Thơm', 'Hà Tiên', 'Quần đảo Nam Du'],
  },
  {
    name: 'Cần Thơ',
    slug: 'can-tho',
    region: 'south',
    knownFor: 'Thủ phủ miền Tây, chợ nổi Cái Răng',
    bestSeason: 'Tháng 12-4',
    summary:
      'Trung tâm Đồng bằng sông Cửu Long với chợ nổi Cái Răng sầm uất, bến Ninh Kiều, nhà cổ Bình Thuỷ và vườn cò Bằng Lăng.',
    specialties: ['Bánh cống', 'Lẩu mắm', 'Nem nướng Cái Răng', 'Bánh tét lá cẩm'],
    highlights: ['Chợ nổi Cái Răng', 'Bến Ninh Kiều', 'Nhà cổ Bình Thuỷ', 'Vườn cò Bằng Lăng'],
  },
  {
    name: 'Hậu Giang',
    slug: 'hau-giang',
    region: 'south',
    knownFor: 'Chợ nổi Ngã Bảy, kênh xáng Xà No',
    bestSeason: 'Tháng 12-4',
    summary:
      'Vùng sông nước với chợ nổi Ngã Bảy (Phụng Hiệp) nổi tiếng, khu bảo tồn Lung Ngọc Hoàng và miệt vườn trái cây.',
    specialties: ['Khóm Cầu Đúc', 'Cá thát lát', 'Bưởi Năm Roi Phú Hữu', 'Đọt choại'],
    highlights: ['Chợ nổi Ngã Bảy', 'Khu bảo tồn Lung Ngọc Hoàng', 'Kênh xáng Xà No'],
  },
  {
    name: 'Sóc Trăng',
    slug: 'soc-trang',
    region: 'south',
    knownFor: 'Chùa Khmer, chùa Dơi, lễ Oóc Om Bóc',
    bestSeason: 'Tháng 11-12 (lễ hội đua ghe ngo)',
    summary:
      'Giao thoa văn hoá Kinh - Khmer - Hoa với chùa Dơi độc đáo, chùa Đất Sét và lễ hội đua ghe ngo sôi động.',
    specialties: ['Bún nước lèo Sóc Trăng', 'Bánh pía', 'Lạp xưởng', 'Bánh cống'],
    highlights: ['Chùa Dơi', 'Chùa Đất Sét', 'Chùa Chén Kiểu', 'Cồn Mỹ Phước'],
  },
  {
    name: 'Bạc Liêu',
    slug: 'bac-lieu',
    region: 'south',
    knownFor: 'Nhà Công tử Bạc Liêu, điện gió',
    bestSeason: 'Tháng 12-4',
    summary:
      'Đất của giai thoại Công tử Bạc Liêu và bản "Dạ cổ hoài lang", với cánh đồng điện gió ven biển và vườn chim, vườn nhãn cổ.',
    specialties: ['Bún bò cay', 'Bánh tằm Ngan Dừa', 'Ba khía', 'Nhãn Bạc Liêu'],
    highlights: ['Nhà Công tử Bạc Liêu', 'Cánh đồng điện gió', 'Vườn chim Bạc Liêu', 'Quán âm Phật đài'],
  },
  {
    name: 'Cà Mau',
    slug: 'ca-mau',
    region: 'south',
    knownFor: 'Mũi Cà Mau - cực Nam Tổ quốc',
    bestSeason: 'Tháng 12-4',
    summary:
      'Điểm cực Nam đất nước với mũi Cà Mau, rừng ngập mặn đước U Minh Hạ, sân chim và hệ sinh thái sông nước độc đáo.',
    specialties: ['Cua Cà Mau', 'Tôm', 'Ba khía muối', 'Cá thòi lòi', 'Mật ong U Minh'],
    highlights: ['Mũi Cà Mau', 'Rừng U Minh Hạ', 'Đầm Thị Tường', 'Hòn Đá Bạc'],
  },
];

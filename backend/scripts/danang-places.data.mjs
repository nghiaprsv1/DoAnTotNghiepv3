/**
 * Dữ liệu 15 địa điểm du lịch Đà Nẵng (trích & biên tập từ bài bestprice.vn:
 * "5 điểm đến nổi tiếng của thành phố đáng sống nhất Việt Nam").
 * Mỗi place khớp CreatePlaceDto của backend.
 */

const PROVINCE_DANANG = '7ffbceea-be12-4e81-84d5-b00cb0d86531';
const CAT = {
  food: '22163be9-6ad6-4c38-b238-1e55f9dc7ddf',
  beach: '2116ca4e-8b39-47fd-9863-801cc6fb2550',
  island: '5d7747cd-7cf5-48bd-9e7b-a3a24487932b',
  mountain: '85def9b1-7f34-4196-b3a1-81c53cd8e4b1',
  adventure: '80849be6-71bb-4e5a-b985-1cd4c385c3bd',
  city: '9aa36af5-be4d-4ab6-948a-910f3f9709ae',
  culture: 'cac86b48-d362-462b-a1cb-3d3251814ea3',
};
const cover = (seed) => `https://picsum.photos/seed/${seed}/1200/800`;

export const PLACES = [
  {
    name: 'Cầu Sông Hàn',
    slug: 'cau-song-han-da-nang',
    description:
      'Cây cầu quay đầu tiên do chính kỹ sư Việt Nam thiết kế và thi công, biểu tượng của thành phố Đà Nẵng, nối liền quận Hải Châu và Sơn Trà.',
    longDescription:
      'Cầu Sông Hàn bắc qua sông Hàn thơ mộng, nối hai bờ quận Hải Châu và Sơn Trà. Điểm độc đáo nhất là phần cầu giữa có thể quay 90 độ quanh trục vào khoảng 1 giờ sáng mỗi đêm để mở luồng cho tàu lớn qua lại, rồi quay về vị trí cũ lúc 4-5 giờ sáng. Vào ban đêm, cầu lung linh ánh đèn, là nơi người dân và du khách dạo mát, ngắm cảnh sông Hàn.',
    categoryId: CAT.city,
    provinceId: PROVINCE_DANANG,
    city: 'Đà Nẵng',
    coverImage: cover('cau-song-han'),
    entranceFee: 'Miễn phí',
    tags: ['cầu', 'biểu tượng', 'sông Hàn', 'check-in', 'về đêm'],
    rating: 4.6,
  },
  {
    name: 'Công viên Châu Á (Asia Park)',
    slug: 'cong-vien-chau-a-asia-park',
    description:
      'Khu vui chơi giải trí rộng hơn 868.000 m² với vòng quay Mặt Trời (Sun Wheel) cao 115m thuộc top 5 thế giới, cùng các khu trò chơi và kiến trúc thu nhỏ của châu Á.',
    longDescription:
      'Công viên Châu Á (Asia Park) có diện tích hơn 868.694 m², chia làm ba khu: khu trò chơi ngoài trời hiện đại, khu công trình kiến trúc thu nhỏ tái hiện các nước châu Á, và khu vòng quay Mặt Trời (Sun Wheel) cao 115m - một trong những vòng quay cao nhất thế giới. Thời điểm tham quan đẹp nhất là sáng sớm, chiều mát hoặc buổi tối khi cả công viên rực rỡ ánh đèn.',
    categoryId: CAT.city,
    provinceId: PROVINCE_DANANG,
    city: 'Đà Nẵng',
    coverImage: cover('asia-park'),
    entranceFee: 'Vé vào cổng theo gói của Sun World',
    tags: ['công viên', 'giải trí', 'Sun Wheel', 'gia đình', 'vui chơi'],
    rating: 4.5,
  },
  {
    name: 'Bảo tàng tranh 3D Đà Nẵng',
    slug: 'bao-tang-tranh-3d-da-nang',
    description:
      'Bảo tàng tranh 3D rộng 3.000 m² với 9 khu chủ đề, các bức tranh nghệ thuật 3D sống động do nghệ sĩ Hàn Quốc thực hiện, cho du khách tương tác và chụp ảnh.',
    longDescription:
      'Bảo tàng tranh 3D (Art in Paradise) rộng khoảng 3.000 m², gồm 9 khu vực chủ đề với những bức tranh 3D độc đáo do các nghệ sĩ Hàn Quốc vẽ. Du khách có thể tạo dáng hòa vào tranh để có những bức ảnh sống động như thật. Mở cửa 9h00 - 20h00 hằng ngày. Giá vé: người lớn 140.000đ; trẻ em cao 1-1.3m 100.000đ.',
    categoryId: CAT.culture,
    provinceId: PROVINCE_DANANG,
    city: 'Đà Nẵng',
    coverImage: cover('bao-tang-3d'),
    entranceFee: 'Người lớn 140.000đ, trẻ em 100.000đ',
    tags: ['bảo tàng', 'tranh 3D', 'check-in', 'nghệ thuật', 'trong nhà'],
    rating: 4.4,
  },
  {
    name: 'Cầu Rồng',
    slug: 'cau-rong-da-nang',
    description:
      'Cây cầu hình con rồng vươn mình ra biển, biểu tượng cho sự thịnh vượng của châu Á. Nổi tiếng với màn phun lửa và phun nước vào tối cuối tuần.',
    longDescription:
      'Cầu Rồng được thiết kế hình một con rồng đang vươn mình bay ra biển Đông, tượng trưng cho sự phát triển thịnh vượng. Đây là một trong những cây cầu độc đáo nhất Đà Nẵng. Vào 21h00 các tối thứ Bảy, Chủ nhật và ngày lễ, đầu rồng phun lửa và phun nước phục vụ du khách - một màn trình diễn không thể bỏ lỡ khi đến Đà Nẵng.',
    categoryId: CAT.city,
    provinceId: PROVINCE_DANANG,
    city: 'Đà Nẵng',
    coverImage: cover('cau-rong'),
    entranceFee: 'Miễn phí',
    tags: ['cầu', 'biểu tượng', 'phun lửa', 'về đêm', 'check-in'],
    rating: 4.7,
  },
  {
    name: 'Ngũ Hành Sơn',
    slug: 'ngu-hanh-son-da-nang',
    description:
      'Quần thể năm ngọn núi đá vôi cách trung tâm 7km với hệ thống hang động, chùa cổ linh thiêng và làng nghề đá mỹ nghệ Non Nước gần 400 năm tuổi.',
    longDescription:
      'Ngũ Hành Sơn cách trung tâm Đà Nẵng khoảng 7km, gồm năm ngọn núi đá vôi mang tên Kim - Mộc - Thủy - Hỏa - Thổ. Nơi đây có bốn hang động tự nhiên kỳ thú (Quan Âm, Hoa Nghiêm, Thiên Long, Linh Nha) cùng nhiều ngôi chùa cổ kính, linh thiêng. Dưới chân núi là làng đá mỹ nghệ Non Nước với lịch sử gần 400 năm, nổi tiếng với các sản phẩm điêu khắc đá tinh xảo.',
    categoryId: CAT.mountain,
    provinceId: PROVINCE_DANANG,
    city: 'Đà Nẵng',
    coverImage: cover('ngu-hanh-son'),
    entranceFee: 'Khoảng 40.000đ/người',
    tags: ['núi', 'hang động', 'chùa', 'tâm linh', 'làng nghề'],
    rating: 4.6,
  },
  {
    name: 'Bà Nà Hills',
    slug: 'ba-na-hills-da-nang',
    description:
      'Khu du lịch nghỉ dưỡng trên núi cách trung tâm 25km, khí hậu "bốn mùa trong một ngày", nổi tiếng với cáp treo, làng Pháp cổ tích và chùa Linh Ứng.',
    longDescription:
      'Bà Nà Hills cách trung tâm Đà Nẵng khoảng 25km, nằm trên đỉnh núi với khí hậu mát mẻ quanh năm, được ví như "bốn mùa trong một ngày". Từ đây du khách phóng tầm mắt ngắm đồng bằng Hòa Vang, bán đảo Sơn Trà và dòng sông Hàn. Các hoạt động hấp dẫn: đi cáp treo đạt nhiều kỷ lục thế giới, trò chơi mạo hiểm, leo núi, vườn hoa Le Jardin, chùa Linh Ứng. Vé cáp treo khứ hồi: người lớn 750.000đ, trẻ em 600.000đ, trẻ dưới 1m miễn phí.',
    categoryId: CAT.mountain,
    provinceId: PROVINCE_DANANG,
    city: 'Đà Nẵng',
    coverImage: cover('ba-na-hills'),
    entranceFee: 'Cáp treo khứ hồi: người lớn 750.000đ, trẻ em 600.000đ',
    tags: ['núi', 'cáp treo', 'nghỉ dưỡng', 'làng Pháp', 'check-in'],
    rating: 4.7,
  },
  {
    name: 'Cù Lao Chàm',
    slug: 'cu-lao-cham',
    description:
      'Quần đảo gồm 8 hòn đảo với rạn san hô rực rỡ và hệ sinh thái biển phong phú, lý tưởng cho lặn ngắm san hô và thưởng thức hải sản tươi ngon.',
    longDescription:
      'Cù Lao Chàm là quần đảo gồm 8 hòn đảo lớn nhỏ, được công nhận là Khu dự trữ sinh quyển thế giới. Du khách có thể lặn biển ngắm những rạn san hô đầy màu sắc và sinh vật biển đa dạng. Đặc sản nơi đây gồm mực một nắng, ốc vú nàng, tôm hùm nướng và nhiều loại hải sản tươi ngon. (Về mặt hành chính thuộc Quảng Nam, thường được kết hợp trong hành trình du lịch Đà Nẵng - Hội An.)',
    categoryId: CAT.island,
    provinceId: PROVINCE_DANANG,
    city: 'Hội An',
    coverImage: cover('cu-lao-cham'),
    entranceFee: 'Tùy gói tour, có phí tham quan khu bảo tồn',
    tags: ['đảo', 'lặn biển', 'san hô', 'hải sản', 'biển'],
    rating: 4.5,
  },
  {
    name: 'Cầu khóa tình yêu',
    slug: 'cau-khoa-tinh-yeu-da-nang',
    description:
      'Cây cầu nằm giữa cầu Sông Hàn và cầu Rồng, lấy ý tưởng từ những chiếc khóa tình yêu nổi tiếng châu Âu, điểm hẹn lãng mạn cho các cặp đôi.',
    longDescription:
      'Cầu khóa tình yêu (Cầu Tình Yêu) nằm giữa cầu Sông Hàn và cầu Rồng, được xây dựng theo ý tưởng từ những cây cầu khóa tình yêu nổi tiếng ở châu Âu. Các cặp đôi đến đây treo những chiếc khóa khắc tên mình như lời hẹn ước. Đây cũng là vị trí ngắm pháo hoa lý tưởng trong Lễ hội pháo hoa quốc tế Đà Nẵng.',
    categoryId: CAT.city,
    provinceId: PROVINCE_DANANG,
    city: 'Đà Nẵng',
    coverImage: cover('cau-khoa-tinh-yeu'),
    entranceFee: 'Miễn phí',
    tags: ['cầu', 'lãng mạn', 'cặp đôi', 'check-in', 'về đêm'],
    rating: 4.3,
  },
  {
    name: 'Cầu Vàng',
    slug: 'cau-vang-ba-na-hills',
    description:
      'Cây cầu vàng nổi tiếng thế giới nằm trong Bà Nà Hills, được nâng đỡ bởi đôi bàn tay khổng lồ giữa lưng chừng núi, điểm chụp ảnh và tổ chức sự kiện đình đám.',
    longDescription:
      'Cầu Vàng (Golden Bridge) nằm trong khu Bà Nà Hills, gây ấn tượng mạnh với thiết kế hai bàn tay khổng lồ nâng đỡ dải cầu màu vàng uốn lượn giữa lưng chừng núi. Cây cầu từng gây sốt trên truyền thông quốc tế, trở thành địa điểm chụp ảnh cưới, tổ chức sự kiện thời trang và là biểu tượng du lịch mới của Đà Nẵng.',
    categoryId: CAT.mountain,
    provinceId: PROVINCE_DANANG,
    city: 'Đà Nẵng',
    coverImage: cover('cau-vang'),
    entranceFee: 'Nằm trong vé Bà Nà Hills',
    tags: ['cầu', 'Bà Nà', 'check-in', 'biểu tượng', 'bàn tay'],
    rating: 4.8,
  },
  {
    name: 'Bán đảo Sơn Trà',
    slug: 'ban-dao-son-tra-da-nang',
    description:
      'Bán đảo cách trung tâm 10km với hệ sinh thái rừng nguyên sinh, khí hậu mát mẻ quanh năm. Nổi bật với chùa Linh Ứng, đỉnh Bàn Cờ và bãi biển Obama.',
    longDescription:
      'Bán đảo Sơn Trà cách trung tâm Đà Nẵng khoảng 10km, sở hữu hệ sinh thái rừng nguyên sinh quý hiếm cùng khí hậu mát mẻ quanh năm. Đây được xem là nơi duy nhất ở Việt Nam có hệ sinh thái kết hợp rừng và biển. Các điểm nổi bật: chùa Linh Ứng với tượng Phật Bà cao nhất Việt Nam, đỉnh Bàn Cờ, bãi biển Obama. Sơn Trà còn là nơi sinh sống của loài voọc chà vá chân nâu quý hiếm.',
    categoryId: CAT.mountain,
    provinceId: PROVINCE_DANANG,
    city: 'Đà Nẵng',
    coverImage: cover('ban-dao-son-tra'),
    entranceFee: 'Miễn phí (một số điểm tham quan riêng)',
    tags: ['bán đảo', 'rừng', 'chùa Linh Ứng', 'thiên nhiên', 'voọc'],
    rating: 4.6,
  },
  {
    name: 'Bãi biển Mỹ Khê',
    slug: 'bai-bien-my-khe-da-nang',
    description:
      'Một trong những bãi biển sạch và đẹp nhất Việt Nam, từng được bình chọn vào danh sách bãi biển đẹp nhất thế giới, lý tưởng cho tắm biển và thể thao biển.',
    longDescription:
      'Bãi biển Mỹ Khê được mệnh danh là một trong những bãi biển sạch và đẹp nhất Việt Nam, từng được tạp chí quốc tế bình chọn vào danh sách những bãi biển quyến rũ nhất hành tinh. Bờ cát trắng mịn trải dài, nước biển trong xanh. Du khách có thể tắm biển, chơi bóng chuyền bãi biển, lướt sóng, lặn biển, hoặc thuê phao và ghế nghỉ ngơi thư giãn.',
    categoryId: CAT.beach,
    provinceId: PROVINCE_DANANG,
    city: 'Đà Nẵng',
    coverImage: cover('bai-bien-my-khe'),
    entranceFee: 'Miễn phí',
    tags: ['biển', 'tắm biển', 'thể thao biển', 'cát trắng', 'nghỉ dưỡng'],
    rating: 4.7,
  },
  {
    name: 'Suối khoáng nóng Núi Thần Tài',
    slug: 'suoi-khoang-nong-nui-than-tai',
    description:
      'Khu nghỉ dưỡng suối khoáng nóng giữa rừng nguyên sinh với hồ tắm khoáng, spa, lưu trú cao cấp, nhà hàng và cà phê, lý tưởng để thư giãn phục hồi sức khỏe.',
    longDescription:
      'Khu du lịch suối khoáng nóng Núi Thần Tài là điểm nghỉ dưỡng chăm sóc sức khỏe nằm giữa rừng nguyên sinh. Nơi đây có hệ thống hồ tắm khoáng nóng tự nhiên, dịch vụ spa, lưu trú cao cấp, nhà hàng và cà phê. Vé vào cổng: người lớn 400.000đ, trẻ em 200.000đ, trẻ dưới 1.3m miễn phí. Các dịch vụ bổ sung từ 300.000đ - 800.000đ.',
    categoryId: CAT.mountain,
    provinceId: PROVINCE_DANANG,
    city: 'Đà Nẵng',
    coverImage: cover('nui-than-tai'),
    entranceFee: 'Người lớn 400.000đ, trẻ em 200.000đ',
    tags: ['suối khoáng nóng', 'nghỉ dưỡng', 'spa', 'thư giãn', 'sức khỏe'],
    rating: 4.5,
  },
  {
    name: 'Chợ Cồn',
    slug: 'cho-con-da-nang',
    description:
      'Khu chợ sầm uất ở trung tâm quận Hải Châu, thiên đường ẩm thực đường phố Đà Nẵng với hải sản, bánh xèo, gỏi cuốn, bánh canh và đủ loại đặc sản.',
    longDescription:
      'Chợ Cồn nằm ở trung tâm quận Hải Châu, là một trong những khu chợ lâu đời và sầm uất nhất Đà Nẵng. Chợ bán đủ mọi mặt hàng: thực phẩm, đồ gia dụng, thời trang. Hấp dẫn nhất là khu ẩm thực với hải sản tươi, bánh xèo, gỏi cuốn, bánh canh và vô số món ăn vặt đặc trưng xứ Quảng. Đây là điểm đến không thể bỏ qua với tín đồ ẩm thực.',
    categoryId: CAT.food,
    provinceId: PROVINCE_DANANG,
    city: 'Đà Nẵng',
    coverImage: cover('cho-con'),
    entranceFee: 'Miễn phí',
    tags: ['chợ', 'ẩm thực', 'đặc sản', 'ăn vặt', 'mua sắm'],
    rating: 4.4,
  },
  {
    name: 'Bảo tàng Điêu khắc Chăm Pa',
    slug: 'bao-tang-dieu-khac-cham-pa',
    description:
      'Bảo tàng lưu giữ hơn 2.000 hiện vật văn hóa Chăm Pa cổ - bảo tàng duy nhất trên thế giới bảo tồn nền văn hóa Chăm cổ đại.',
    longDescription:
      'Bảo tàng Điêu khắc Chăm Pa lưu giữ hơn 2.000 hiện vật văn hóa của vương quốc Chăm Pa cổ, được xem là bảo tàng duy nhất trên thế giới chuyên bảo tồn nền văn hóa Chăm cổ đại. Các tác phẩm điêu khắc đá, tượng thần, phù điêu tinh xảo phản ánh đời sống tín ngưỡng và nghệ thuật rực rỡ một thời. Địa chỉ: số 2 đường 2/9, quận Hải Châu. Vé 70.000đ/người. Mở cửa đến 19h00 hằng ngày.',
    categoryId: CAT.culture,
    provinceId: PROVINCE_DANANG,
    city: 'Đà Nẵng',
    address: 'Số 2 đường 2/9, quận Hải Châu, Đà Nẵng',
    coverImage: cover('bao-tang-cham'),
    entranceFee: '70.000đ/người',
    tags: ['bảo tàng', 'văn hóa Chăm', 'lịch sử', 'điêu khắc', 'di sản'],
    rating: 4.5,
  },
  {
    name: 'Phố cổ Hội An',
    slug: 'pho-co-hoi-an',
    description:
      'Đô thị cổ cách Đà Nẵng 30km về phía nam, di sản văn hóa thế giới với hơn 1.300 di tích nhà cổ, hội quán, chùa cầu, lung linh đèn lồng về đêm.',
    longDescription:
      'Phố cổ Hội An cách Đà Nẵng khoảng 30km về phía nam, là Di sản Văn hóa Thế giới được UNESCO công nhận. Nơi đây có hơn 1.300 di tích gồm nhà cổ, đền miếu, giếng cổ, hội quán mang đậm dấu ấn giao thoa văn hóa Việt - Hoa - Nhật. Khung cảnh ven sông Hoài cùng những dãy đèn lồng rực rỡ về đêm tạo nên vẻ đẹp hoài cổ, lý tưởng cho chụp ảnh. (Về hành chính thuộc Quảng Nam, thường ghép tuyến với Đà Nẵng.)',
    categoryId: CAT.culture,
    provinceId: PROVINCE_DANANG,
    city: 'Hội An',
    coverImage: cover('pho-co-hoi-an'),
    entranceFee: 'Vé tham quan phố cổ khoảng 120.000đ/người',
    tags: ['phố cổ', 'di sản', 'đèn lồng', 'văn hóa', 'check-in'],
    rating: 4.8,
  },
];

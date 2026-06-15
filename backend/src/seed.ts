/**
 * Quick seed — creates a couple provinces, categories, an admin and demo trip.
 * Run with `npm run seed` after starting Postgres and ensuring DB exists.
 */
import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import dataSource from './datasource';
import { User } from './modules/user/entities/user.entity';
import { Province } from './modules/place/entities/province.entity';
import { Category } from './modules/place/entities/category.entity';
import { Place } from './modules/place/entities/place.entity';
import { Trip } from './modules/trip/entities/trip.entity';
import { TripMember, TripMemberRole } from './modules/trip/entities/trip-member.entity';
import { Post } from './modules/post/entities/post.entity';
import {
  GuideProfile,
  GuideStatus,
  GuideAvailability,
} from './modules/guide/entities/guide-profile.entity';
import { UserRole } from './common/enums/user-role.enum';

async function run() {
  await dataSource.initialize();
  const userRepo = dataSource.getRepository(User);
  const provRepo = dataSource.getRepository(Province);
  const catRepo = dataSource.getRepository(Category);
  const tripRepo = dataSource.getRepository(Trip);
  const memberRepo = dataSource.getRepository(TripMember);
  const placeRepo = dataSource.getRepository(Place);
  const postRepo = dataSource.getRepository(Post);
  const guideRepo = dataSource.getRepository(GuideProfile);

  // Categories
  const cats = [
    ['beach', 'Biển', 'beach_access'],
    ['mountain', 'Núi', 'terrain'],
    ['food', 'Ẩm thực', 'restaurant'],
    ['culture', 'Văn hoá', 'temple_buddhist'],
    ['city', 'Thành phố', 'location_city'],
    ['island', 'Đảo', 'sailing'],
    ['adventure', 'Phiêu lưu', 'hiking'],
  ] as const;
  for (const [key, label, icon] of cats) {
    const exists = await catRepo.findOne({ where: { key } });
    if (!exists) await catRepo.save(catRepo.create({ key, label, icon }));
  }

  // Provinces
  const provs = [
    ['Hà Nội', 'ha-noi', 'north'],
    ['Hạ Long', 'ha-long', 'north'],
    ['Sapa', 'sa-pa', 'north'],
    ['Hà Giang', 'ha-giang', 'north'],
    ['Đà Nẵng', 'da-nang', 'central'],
    ['Hội An', 'hoi-an', 'central'],
    ['Phú Quốc', 'phu-quoc', 'south'],
    ['TP.HCM', 'ho-chi-minh', 'south'],
  ] as const;
  for (const [name, slug, region] of provs) {
    const exists = await provRepo.findOne({ where: { slug } });
    if (!exists) await provRepo.save(provRepo.create({ name, slug, region }));
  }

  // Admin
  const adminEmail = 'admin@tripmate.local';
  let admin = await userRepo.findOne({ where: { email: adminEmail } });
  if (!admin) {
    admin = await userRepo.save(
      userRepo.create({
        email: adminEmail,
        name: 'Admin',
        handle: 'admin',
        role: UserRole.ADMIN,
        verified: true,
        passwordHash: await bcrypt.hash('admin1234', 10),
      }),
    );
    console.log('✓ admin@tripmate.local / admin1234');
  }

  // Demo traveler
  const demoEmail = 'linh@tripmate.local';
  let demo = await userRepo.findOne({ where: { email: demoEmail } });
  if (!demo) {
    demo = await userRepo.save(
      userRepo.create({
        email: demoEmail,
        name: 'Linh Nguyễn',
        handle: 'linh.nguyen',
        role: UserRole.USER,
        avatar:
          'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
        passwordHash: await bcrypt.hash('demo1234', 10),
      }),
    );
    console.log('✓ linh@tripmate.local / demo1234');
  }

  // Demo trip
  const beach = await catRepo.findOneOrFail({ where: { key: 'island' } });
  const tripCount = await tripRepo.count();
  if (tripCount === 0) {
    const trip = await tripRepo.save(
      tripRepo.create({
        title: 'Luxury Cruise & Hidden Caves Exploration',
        description: 'Three days aboard a premium junk boat in Ha Long Bay.',
        destination: 'Hạ Long',
        categoryId: beach.id,
        coverImage:
          'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1600&q=80',
        startDate: '2026-10-12',
        endDate: '2026-10-15',
        durationDays: 3,
        priceFrom: 450,
        currency: '$',
        rating: 4.9,
        maxMembers: 6,
        memberCount: 1,
        creatorId: demo.id,
        tags: ['Adventure', 'Cultural'],
      }),
    );
    await memberRepo.save(
      memberRepo.create({ tripId: trip.id, userId: demo.id, role: TripMemberRole.LEADER }),
    );
    console.log('✓ demo trip created');
  }

  // Places
  if ((await placeRepo.count()) === 0) {
    const halong = await provRepo.findOneOrFail({ where: { slug: 'ha-long' } });
    const sapa = await provRepo.findOneOrFail({ where: { slug: 'sa-pa' } });
    const hoian = await provRepo.findOneOrFail({ where: { slug: 'hoi-an' } });
    const cBeach = await catRepo.findOneOrFail({ where: { key: 'beach' } });
    const cMountain = await catRepo.findOneOrFail({ where: { key: 'mountain' } });
    const cCulture = await catRepo.findOneOrFail({ where: { key: 'culture' } });
    await placeRepo.save([
      placeRepo.create({
        name: 'Vịnh Hạ Long',
        slug: 'vinh-ha-long',
        description: 'Di sản UNESCO với hơn 1.600 hòn đảo đá vôi tuyệt đẹp.',
        categoryId: cBeach.id,
        provinceId: halong.id,
        coverImage: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1600&q=80',
        rating: 4.9,
        reviewCount: 1240,
        tags: ['UNESCO', 'Biển', 'Đảo'],
        highlights: ['Du thuyền', 'Hang Sửng Sốt', 'Hang Luồn'],
      }),
      placeRepo.create({
        name: 'Sapa Terraced Fields',
        slug: 'sapa-ruong-bac-thang',
        description: 'Ruộng bậc thang Mường Hoa với mây phủ và bản làng dân tộc.',
        categoryId: cMountain.id,
        provinceId: sapa.id,
        coverImage: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1600&q=80',
        rating: 4.8,
        reviewCount: 890,
        tags: ['Núi', 'Bản làng'],
        highlights: ['Trekking', 'Homestay', 'Chợ phiên'],
      }),
      placeRepo.create({
        name: 'Phố cổ Hội An',
        slug: 'pho-co-hoi-an',
        description: 'Đô thị cổ kính với đèn lồng, sông Hoài và ẩm thực miền Trung.',
        categoryId: cCulture.id,
        provinceId: hoian.id,
        coverImage: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1600&q=80',
        rating: 4.95,
        reviewCount: 2100,
        tags: ['UNESCO', 'Phố cổ'],
        highlights: ['Đèn lồng', 'Cao lầu', 'Chùa Cầu'],
      }),
    ]);
    console.log('✓ places seeded');
  }

  // Posts
  if ((await postRepo.count()) === 0) {
    await postRepo.save([
      postRepo.create({
        authorId: demo.id,
        title: 'Bình minh trên vịnh Hạ Long',
        excerpt: 'Khoảnh khắc mặt trời lên giữa hàng nghìn đảo đá vôi.',
        body: 'Du thuyền xuất phát từ cảng Tuần Châu lúc 6h, ngắm bình minh trên boong và thưởng thức cà phê nóng. Cảm giác thật khó quên.',
        location: 'Hạ Long',
        image: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1600&q=80',
        tags: ['Hạ Long', 'Bình minh'],
        likeCount: 42,
        commentCount: 7,
      }),
      postRepo.create({
        authorId: demo.id,
        title: 'Trekking Sapa: 2 ngày 1 đêm cùng homestay người H\'Mông',
        excerpt: 'Hành trình băng qua ruộng bậc thang và bản làng Mường Hoa.',
        body: 'Ngày 1 trekking 14km, ngày 2 thăm bản Tả Van và chợ phiên. Đồ ăn ngon, người dân mến khách.',
        location: 'Sapa',
        image: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1600&q=80',
        tags: ['Sapa', 'Trekking', 'Homestay'],
        likeCount: 128,
        commentCount: 19,
      }),
    ]);
    console.log('✓ posts seeded');
  }

  // Guide profile demo
  if ((await guideRepo.count()) === 0) {
    await guideRepo.save(
      guideRepo.create({
        userId: demo.id,
        region: 'Hạ Long & Đông Bắc',
        regionKeys: ['ha-long', 'north'],
        categoryKeys: ['beach', 'island', 'adventure'],
        languages: ['Vietnamese', 'English'],
        specialties: ['Du thuyền', 'Kayak'],
        bio: 'Hướng dẫn viên với 5 năm kinh nghiệm khám phá Hạ Long.',
        yearsExperience: 5,
        pricePerDay: 1200000,
        currency: 'VND',
        rating: 4.9,
        reviewCount: 87,
        toursCompleted: 142,
        responseTime: 'trong 1 giờ',
        availability: GuideAvailability.AVAILABLE,
        availabilityLabel: 'Còn lịch tháng 12',
        highlights: ['Top Rated', 'Local Expert'],
        status: GuideStatus.APPROVED,
      }),
    );
    console.log('✓ guide seeded');
  }

  await dataSource.destroy();
  console.log('✅ Seed done');
}

run().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});

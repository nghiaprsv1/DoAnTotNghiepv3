import ds from './datasource';

/**
 * Reset tư cách HDV của 1 user để test lại luồng đăng ký từ đầu, KHÔNG tạo
 * account mới. Xoá guide_profile + đưa user về role 'user' (giữ nguyên login).
 *
 * Dùng:
 *   npx ts-node -r tsconfig-paths/register src/reset-guide-apply.ts <email>
 *   npx ts-node -r tsconfig-paths/register src/reset-guide-apply.ts <email> --keep-wallet
 */
async function main() {
  const email = process.argv[2];
  const keepWallet = process.argv.includes('--keep-wallet');
  if (!email) {
    console.error('❌ Thiếu email. Vd: ... src/reset-guide-apply.ts linh@tripmate.local');
    process.exit(1);
  }

  await ds.initialize();

  const users = await ds.query(`SELECT id, name, role, verified FROM users WHERE email = $1`, [email]);
  if (users.length === 0) {
    console.error(`❌ Không tìm thấy user với email: ${email}`);
    await ds.destroy();
    process.exit(1);
  }
  const user = users[0];
  console.log(`User: ${user.name} (${email}) | role=${user.role} | verified=${user.verified}`);

  // 1) Xoá guide_profile (gỡ điều kiện chặn "Application already submitted").
  const delProfile = await ds.query(`DELETE FROM guide_profiles WHERE user_id = $1`, [user.id]);
  console.log(`- Đã xoá guide_profiles: ${delProfile[1] ?? 0} dòng`);

  // 2) Đưa user về thường. Giữ verified=true để vẫn đăng nhập được (email đã xác thực).
  await ds.query(`UPDATE users SET role = 'user' WHERE id = $1`, [user.id]);
  console.log(`- Đã đặt users.role = 'user'`);

  // 3) (Tuỳ chọn) xoá ví + giao dịch để sạch hẳn. Mặc định GIỮ ví.
  if (!keepWallet) {
    const wallets = await ds.query(`SELECT id FROM wallets WHERE user_id = $1`, [user.id]);
    for (const w of wallets) {
      await ds.query(`DELETE FROM wallet_transactions WHERE wallet_id = $1`, [w.id]);
    }
    const delW = await ds.query(`DELETE FROM wallets WHERE user_id = $1`, [user.id]);
    console.log(`- Đã xoá wallets + transactions: ${delW[1] ?? 0} ví`);
  } else {
    console.log('- Giữ nguyên ví (--keep-wallet)');
  }

  console.log(`\n✅ Xong. Đăng nhập ${email} và vào /guides/apply để đăng ký lại từ đầu.`);
  await ds.destroy();
}
main().catch((e) => { console.error(e); process.exit(1); });

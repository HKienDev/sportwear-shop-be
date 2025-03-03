const bcrypt = require("bcryptjs");

// Mật khẩu người dùng nhập vào
const password = "Kien12345678";

// Mật khẩu đã lưu trong MongoDB
const hashedPassword = "$2b$10$nHELF.5w.hPacWI32Z8gw.qKBBV.f209qrANclc.zLgUMuhtSIthq"; 

async function checkPassword() {
    console.log("Mật khẩu gốc:", password);
    console.log("Mật khẩu hash trong DB:", hashedPassword);

    const isMatch = await bcrypt.compare(password, hashedPassword);
    console.log("Kết quả so sánh:", isMatch);
}

checkPassword();
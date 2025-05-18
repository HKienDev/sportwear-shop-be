import { Body, Container, Head, Heading, Html, Img, Preview, Section, Text, Link, Hr, } from '@react-email/components';
import { Tailwind } from '@react-email/tailwind';
import * as React from 'react';
const RegisterConfirmation = ({ fullname, email, customId, createdAt, }) => {
    const registerDate = createdAt ? new Date(createdAt).toLocaleDateString('vi-VN') : new Date().toLocaleDateString('vi-VN');
    return (React.createElement(Html, null,
        React.createElement(Head, null),
        React.createElement(Preview, null, "Ch\u00E0o m\u1EEBng b\u1EA1n \u0111\u1EBFn v\u1EDBi Sport Store! X\u00E1c nh\u1EADn \u0111\u0103ng k\u00FD t\u00E0i kho\u1EA3n"),
        React.createElement(Tailwind, null,
            React.createElement(Body, { className: "bg-gray-100 font-sans" },
                React.createElement(Container, { className: "mx-auto my-10 max-w-[600px] rounded-lg bg-white p-8 shadow-lg" },
                    React.createElement(Section, { className: "text-center" },
                        React.createElement(Img, { src: "/vju-logo-main.png", width: "160", height: "auto", alt: "Sport Store Logo", className: "mx-auto mb-6" }),
                        React.createElement(Heading, { className: "text-2xl font-bold text-gray-900" }, "Ch\u00E0o m\u1EEBng \u0111\u1EBFn v\u1EDBi Sport Store!"),
                        React.createElement(Text, { className: "text-gray-600" },
                            "Xin ch\u00E0o ",
                            React.createElement("span", { className: "font-semibold" }, fullname),
                            ","),
                        React.createElement(Text, { className: "mt-2 text-gray-600" }, "Ch\u00FAng t\u00F4i r\u1EA5t vui m\u1EEBng khi b\u1EA1n \u0111\u00E3 tham gia c\u00F9ng ch\u00FAng t\u00F4i. T\u00E0i kho\u1EA3n c\u1EE7a b\u1EA1n \u0111\u00E3 \u0111\u01B0\u1EE3c t\u1EA1o th\u00E0nh c\u00F4ng.")),
                    React.createElement(Section, { className: "mt-8 rounded-lg bg-blue-50 p-6" },
                        React.createElement(Heading, { className: "mb-4 text-lg font-semibold text-blue-800" }, "Th\u00F4ng tin t\u00E0i kho\u1EA3n c\u1EE7a b\u1EA1n"),
                        React.createElement("div", { className: "rounded-lg bg-white p-4 shadow-sm" },
                            React.createElement(Text, { className: "mb-2 text-sm font-medium text-gray-500" }, "M\u00E3 kh\u00E1ch h\u00E0ng"),
                            React.createElement(Text, { className: "mb-4 font-semibold text-gray-800" }, customId),
                            React.createElement(Text, { className: "mb-2 text-sm font-medium text-gray-500" }, "Email"),
                            React.createElement(Text, { className: "font-semibold text-gray-800" }, email),
                            React.createElement(Text, { className: "mb-2 text-sm font-medium text-gray-500" }, "Ng\u00E0y \u0111\u0103ng k\u00FD"),
                            React.createElement(Text, { className: "mb-2 font-semibold text-gray-800" }, registerDate))),
                    React.createElement(Section, { className: "mt-8 text-center" },
                        React.createElement(Link, { href: "https://www.vjusport.com/auth/login", className: "inline-block rounded-lg bg-blue-600 px-6 py-3 text-center font-medium text-white shadow-sm hover:bg-blue-700" }, "\u0110\u0103ng nh\u1EADp ngay"),
                        React.createElement(Text, { className: "mt-6 text-sm text-gray-600" }, "N\u1EBFu b\u1EA1n c\u00F3 b\u1EA5t k\u1EF3 c\u00E2u h\u1ECFi ho\u1EB7c c\u1EA7n h\u1ED7 tr\u1EE3, h\u00E3y li\u00EAn h\u1EC7 v\u1EDBi ch\u00FAng t\u00F4i qua email: support@sportstore.com")),
                    React.createElement(Hr, { className: "my-8 border-gray-200" }),
                    React.createElement(Section, { className: "text-center" },
                        React.createElement(Text, { className: "text-xs text-gray-500" }, "\u00A9 2025 Sport Store. T\u1EA5t c\u1EA3 c\u00E1c quy\u1EC1n \u0111\u01B0\u1EE3c b\u1EA3o l\u01B0u."),
                        React.createElement(Text, { className: "mt-1 text-xs text-gray-500" }, "\u0110\u1ECBa ch\u1EC9: 97 \u0110\u01B0\u1EDDng V\u00F5 V\u0103n T\u1EA7n, Ph\u01B0\u1EDDng 6, Qu\u1EADn 3, Th\u00E0nh ph\u1ED1 H\u1ED3 Ch\u00ED Minh"),
                        React.createElement(Text, { className: "mt-4 text-xs text-blue-700 font-medium" }, "Cam k\u1EBFt b\u1EA3o m\u1EADt: Sport Store cam k\u1EBFt b\u1EA3o v\u1EC7 tuy\u1EC7t \u0111\u1ED1i th\u00F4ng tin c\u00E1 nh\u00E2n v\u00E0 t\u00E0i kho\u1EA3n c\u1EE7a b\u1EA1n. M\u1ECDi d\u1EEF li\u1EC7u \u0111\u1EC1u \u0111\u01B0\u1EE3c m\u00E3 h\u00F3a v\u00E0 kh\u00F4ng chia s\u1EBB cho b\u00EAn th\u1EE9 ba.")))))));
};
export default RegisterConfirmation;

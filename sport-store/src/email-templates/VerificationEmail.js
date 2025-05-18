import { Body, Container, Head, Heading, Html, Img, Preview, Section, Text, Link, Hr, } from '@react-email/components';
import { Tailwind } from '@react-email/tailwind';
import * as React from 'react';
const VerificationEmail = ({ otp, name = 'Khách hàng', }) => {
    return (React.createElement(Html, null,
        React.createElement(Head, null),
        React.createElement(Preview, null, "M\u00E3 OTP x\u00E1c th\u1EF1c t\u00E0i kho\u1EA3n c\u1EE7a b\u1EA1n t\u1EA1i Sport Store"),
        React.createElement(Tailwind, null,
            React.createElement(Body, { className: "bg-gray-100 font-sans" },
                React.createElement(Container, { className: "mx-auto my-10 max-w-[600px] rounded-lg bg-white p-8 shadow-lg" },
                    React.createElement(Section, { className: "text-center" },
                        React.createElement(Img, { src: "https://sport-store.vercel.app/vju-logo-main.png", width: "160", height: "auto", alt: "Sport Store Logo", className: "mx-auto mb-6" }),
                        React.createElement(Heading, { className: "text-2xl font-bold text-gray-900" }, "X\u00E1c th\u1EF1c t\u00E0i kho\u1EA3n"),
                        React.createElement(Text, { className: "text-gray-600" },
                            "Xin ch\u00E0o ",
                            React.createElement("span", { className: "font-semibold" }, name),
                            ","),
                        React.createElement(Text, { className: "mt-2 text-gray-600" }, "C\u1EA3m \u01A1n b\u1EA1n \u0111\u00E3 \u0111\u0103ng k\u00FD t\u00E0i kho\u1EA3n t\u1EA1i Sport Store. Vui l\u00F2ng s\u1EED d\u1EE5ng m\u00E3 OTP d\u01B0\u1EDBi \u0111\u00E2y \u0111\u1EC3 x\u00E1c th\u1EF1c t\u00E0i kho\u1EA3n c\u1EE7a b\u1EA1n.")),
                    React.createElement(Section, { className: "mt-8 text-center" },
                        React.createElement("div", { style: {
                                borderRadius: '8px',
                                background: '#f3f4f6',
                                padding: '16px 0',
                                fontSize: '24px',
                                fontWeight: 'bold',
                                letterSpacing: '4px',
                                display: 'inline-block',
                                width: 'auto',
                                margin: '0 auto'
                            } }, otp),
                        React.createElement(Text, { className: "mt-4 text-sm text-gray-600" }, "M\u00E3 n\u00E0y s\u1EBD h\u1EBFt h\u1EA1n sau 10 ph\u00FAt.")),
                    React.createElement(Section, { className: "mt-8 rounded-lg bg-yellow-50 p-4" },
                        React.createElement(Text, { className: "text-sm text-yellow-700" },
                            React.createElement("strong", null, "L\u01B0u \u00FD:"),
                            " N\u1EBFu b\u1EA1n kh\u00F4ng y\u00EAu c\u1EA7u m\u00E3 n\u00E0y, vui l\u00F2ng b\u1ECF qua email n\u00E0y ho\u1EB7c li\u00EAn h\u1EC7 v\u1EDBi ch\u00FAng t\u00F4i n\u1EBFu b\u1EA1n c\u00F3 b\u1EA5t k\u1EF3 th\u1EAFc m\u1EAFc n\u00E0o.")),
                    React.createElement(Section, { className: "mt-8 text-center" },
                        React.createElement(Text, { className: "text-sm text-gray-600" },
                            "C\u1EA7n h\u1ED7 tr\u1EE3? H\u00E3y li\u00EAn h\u1EC7 v\u1EDBi ch\u00FAng t\u00F4i qua email: ",
                            React.createElement(Link, { href: "mailto:support@sportstore.com", className: "text-blue-600 underline" }, "support@sportstore.com"))),
                    React.createElement(Hr, { className: "my-8 border-gray-200" }),
                    React.createElement(Section, { className: "text-center" },
                        React.createElement(Text, { className: "text-xs text-gray-500" }, "\u00A9 2025 Sport Store. T\u1EA5t c\u1EA3 c\u00E1c quy\u1EC1n \u0111\u01B0\u1EE3c b\u1EA3o l\u01B0u."),
                        React.createElement(Text, { className: "mt-1 text-xs text-gray-500" }, "\u0110\u1ECBa ch\u1EC9: 97 \u0110\u01B0\u1EDDng V\u00F5 V\u0103n T\u1EA7n, Ph\u01B0\u1EDDng 6, Qu\u1EADn 3, Th\u00E0nh ph\u1ED1 H\u1ED3 Ch\u00ED Minh")))))));
};
export default VerificationEmail;

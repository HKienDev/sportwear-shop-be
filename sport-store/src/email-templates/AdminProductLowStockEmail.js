"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const AdminProductLowStockEmail = ({ productName, productSku, stockLeft, }) => ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h2", { children: "C\u1EA3nh b\u00E1o s\u1EA3n ph\u1EA9m s\u1EAFp h\u1EBFt h\u00E0ng" }), (0, jsx_runtime_1.jsxs)("p", { children: ["S\u1EA3n ph\u1EA9m ", (0, jsx_runtime_1.jsx)("strong", { children: productName }), " (M\u00E3: ", productSku, ") s\u1EAFp h\u1EBFt h\u00E0ng."] }), (0, jsx_runtime_1.jsxs)("p", { children: [(0, jsx_runtime_1.jsx)("strong", { children: "S\u1ED1 l\u01B0\u1EE3ng c\u00F2n l\u1EA1i:" }), " ", stockLeft] }), (0, jsx_runtime_1.jsx)("p", { children: "Vui l\u00F2ng ki\u1EC3m tra v\u00E0 nh\u1EADp th\u00EAm h\u00E0ng ho\u1EB7c \u1EA9n s\u1EA3n ph\u1EA9m kh\u1ECFi shop n\u1EBFu c\u1EA7n thi\u1EBFt." })] }));
exports.default = AdminProductLowStockEmail;

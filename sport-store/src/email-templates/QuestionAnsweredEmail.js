/* eslint-disable @typescript-eslint/no-unused-vars */
import * as React from "react";

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Link,
  Hr
} from "@react-email/components";
import { jsx, jsxs } from "react/jsx-runtime";

const QuestionAnsweredEmail = ({
  userName,
  productName,
  question,
  answer,
  questionUrl
}) => {
  return jsxs(Html, { children: [
    jsx(Head, {}),
    jsxs(Preview, { children: [
      "Admin đã trả lời câu hỏi của bạn về sản phẩm ",
      productName
    ] }),
    jsxs(Body, { style: main, children: jsxs(Container, { style: container, children: [
      jsxs(Section, { style: header, children: [
        jsx(Heading, { style: h1, children: "Câu hỏi của bạn đã được trả lời!" }),
        jsxs(Text, { style: headerText, children: [
          "Xin chào ",
          userName,
          ", admin đã trả lời câu hỏi của bạn về sản phẩm ",
          productName,
          "."
        ] })
      ] }),
      jsxs(Section, { style: content, children: [
        jsx(Heading, { style: h2, children: "Thông tin sản phẩm" }),
        jsxs(Text, { style: productInfo, children: [
          jsx("strong", { children: "Sản phẩm:" }),
          " ",
          productName
        ] }),
        jsx(Hr, { style: divider }),
        jsx(Heading, { style: h2, children: "Câu hỏi của bạn" }),
        jsxs(Text, { style: questionText, children: [
          "\"",
          question,
          "\""
        ] }),
        jsx(Hr, { style: divider }),
        jsx(Heading, { style: h2, children: "Trả lời từ admin" }),
        jsx(Text, { style: answerText, children: answer })
      ] }),
      jsxs(Section, { style: footer, children: [
        jsxs(Text, { style: footerText, children: [
          "Bạn có thể xem chi tiết sản phẩm tại: ",
          jsxs(Link, { href: questionUrl, style: link, children: [productName] })
        ] }),
        jsx(Text, { style: footerText, children: "Cảm ơn bạn đã sử dụng dịch vụ của Sport Store!" })
      ] })
    ] }) })
  ] });
};

const main = {
  backgroundColor: "#f4f7fa",
  fontFamily: "Arial, sans-serif",
  margin: 0,
  padding: 0,
};

const container = {
  maxWidth: "650px",
  margin: "32px auto",
  background: "#fff",
  borderRadius: "12px",
  boxShadow: "0 4px 24px #e0e7ef",
  padding: 0,
  overflow: "hidden",
};

const header = {
  background: "linear-gradient(90deg, #2563eb 0%, #60a5fa 100%)",
  padding: "32px 0 16px 0",
  textAlign: "center",
};

const h1 = {
  color: "#fff",
  fontSize: "28px",
  fontWeight: "700",
  margin: "0",
  letterSpacing: "1px",
};

const headerText = {
  color: "#e0e7ef",
  fontSize: "16px",
  margin: "8px 0 0 0",
};

const content = {
  padding: "24px 32px",
};

const h2 = {
  fontSize: "18px",
  color: "#222",
  fontWeight: "700",
  margin: "0 0 12px 0",
  borderLeft: "4px solid #2563eb",
  paddingLeft: "12px",
};

const productInfo = {
  fontSize: "16px",
  color: "#333",
  lineHeight: "1.6",
  margin: "0 0 16px 0",
  padding: "16px",
  backgroundColor: "#f8f9fa",
  borderRadius: "8px",
  border: "1px solid #e9ecef",
};

const questionText = {
  fontSize: "16px",
  color: "#856404",
  lineHeight: "1.6",
  margin: "0 0 16px 0",
  padding: "16px",
  backgroundColor: "#fff3cd",
  borderRadius: "8px",
  border: "1px solid #ffeaa7",
  fontStyle: "italic",
};

const answerText = {
  fontSize: "16px",
  color: "#0c5460",
  lineHeight: "1.6",
  margin: "0 0 16px 0",
  padding: "16px",
  backgroundColor: "#d1ecf1",
  borderRadius: "8px",
  border: "1px solid #bee5eb",
  borderLeft: "4px solid #17a2b8",
};

const divider = {
  borderColor: "#e2e8f0",
  margin: "24px 0",
};

const footer = {
  padding: "24px 32px",
  backgroundColor: "#f8f9fa",
  borderTop: "1px solid #e9ecef",
};

const footerText = {
  fontSize: "14px",
  color: "#666",
  margin: "8px 0",
  textAlign: "center",
};

const link = {
  color: "#2563eb",
  textDecoration: "underline",
};

export default QuestionAnsweredEmail; 
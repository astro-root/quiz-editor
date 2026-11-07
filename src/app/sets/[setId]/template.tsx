"use client";

import { motion } from "framer-motion";

// タブを移るたびに、ページの中身をふわっと表示する（layout は残り、ここだけが作り直される）
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: "easeOut" }}>
      {children}
    </motion.div>
  );
}

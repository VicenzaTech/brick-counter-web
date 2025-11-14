'use client';

import { Factory, Mail, Phone, MapPin, Github, Linkedin } from 'lucide-react';
import Link from 'next/link';
import styles from './Footer.module.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        {/* Company Info */}
        <div className={styles.section}>
          <div className={styles.brand}>
            <Factory size={32} />
            <span className={styles.brandName}>VicenzaTech</span>
          </div>
          <p className={styles.description}>
            Hệ thống giám sát và quản lý sản xuất gạch men thông minh, 
            giúp tối ưu hóa quy trình sản xuất và nâng cao hiệu quả.
          </p>
          <div className={styles.social}>
            <a href="#" className={styles.socialLink} aria-label="GitHub">
              <Github size={20} />
            </a>
            <a href="#" className={styles.socialLink} aria-label="LinkedIn">
              <Linkedin size={20} />
            </a>
          </div>
        </div>

        {/* Quick Links */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Liên kết nhanh</h3>
          <ul className={styles.links}>
            <li>
              <Link href="/" className={styles.link}>Tổng quan</Link>
            </li>
            <li>
              <Link href="/device-dashboard" className={styles.link}>Phân tích thiết bị</Link>
            </li>
            <li>
              <Link href="/data-center" className={styles.link}>Trung tâm dữ liệu</Link>
            </li>
          </ul>
        </div>

        {/* Support */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Hỗ trợ</h3>
          <ul className={styles.links}>
            <li>
              <a href="#" className={styles.link}>Hướng dẫn sử dụng</a>
            </li>
            <li>
              <a href="#" className={styles.link}>Câu hỏi thường gặp</a>
            </li>
            <li>
              <a href="#" className={styles.link}>Liên hệ hỗ trợ</a>
            </li>
          </ul>
        </div>

        {/* Contact */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Liên hệ</h3>
          <ul className={styles.contacts}>
            <li className={styles.contact}>
              <MapPin size={16} />
              <span>Việt Nam</span>
            </li>
            <li className={styles.contact}>
              <Phone size={16} />
              <span>+84 xxx xxx xxx</span>
            </li>
            <li className={styles.contact}>
              <Mail size={16} />
              <span>info@vicenzatech.com</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Copyright */}
      <div className={styles.copyright}>
        <div className={styles.container}>
          <p>© {currentYear} VicenzaTech. All rights reserved.</p>
          <div className={styles.copyrightLinks}>
            <a href="#" className={styles.copyrightLink}>Privacy Policy</a>
            <span className={styles.separator}>•</span>
            <a href="#" className={styles.copyrightLink}>Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

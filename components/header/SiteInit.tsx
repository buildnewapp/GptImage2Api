"use client";

import { useEffect } from "react";
// @ts-ignore
import AOS from 'aos';
import 'aos/dist/aos.css';

/**
 * https://michalsnik.github.io/aos/
 * https://github.com/michalsnik/aos
 * data-aos="fade-up" data-aos-delay={50+index*200}
 */
export default function SiteInit() {

    useEffect(() => {
        AOS.init({disable:'phone'});
    }, []);

    return null;
}

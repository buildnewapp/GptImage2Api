"use client";

import { useEffect } from "react";
import 'aos/dist/aos.css';

/**
 * https://michalsnik.github.io/aos/
 * https://github.com/michalsnik/aos
 * data-aos="fade-up" data-aos-delay={50+index*200}
 */
export default function SiteInit() {

    useEffect(() => {
        let mounted = true;

        // @ts-expect-error AOS does not ship TypeScript declarations.
        import("aos").then(({ default: AOS }) => {
            if (mounted) {
                AOS.init({disable:'phone'});
            }
        });

        return () => {
            mounted = false;
        };
    }, []);

    return null;
}

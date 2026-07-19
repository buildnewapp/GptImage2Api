"use client";

import Script from "next/script";

const SiteTracking = () => {
  return (
    <>
      <Script
        src="https://ga.smnzb.com/script.js"
        data-website-id="d40a2fcf-3957-4b98-b618-3e77cc0da589"
        defer
        strategy="afterInteractive"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="https://ga.smnzb.com/p/jMU1i26oJ"
        alt=""
        width={1}
        height={1}
        aria-hidden="true"
        className="hidden"
      />
    </>
  );
};

export default SiteTracking;

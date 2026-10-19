import { Navigation } from "@/components/navigation";
import { Webring } from "@/components/webring";
import { SignatureIntro } from "@/components/signature-intro";
import { SignatureName } from "@/components/signature-name";
import { SiteHeader } from "@/components/site-header";

export function Intro() {
  return (
    <>
      <SignatureIntro />
      <SiteHeader>
        <div className="header-utility">
          <Webring />
        </div>
        <h1 className="masthead">
          <SignatureName />
        </h1>
        <Navigation />
      </SiteHeader>
    </>
  );
}

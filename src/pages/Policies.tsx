import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import Sidebar from "../components/Sidebar";
import MobileSidebar from "../components/MobileSidebar";
import { fetchOrderData, findIssuedPolicies } from "@/api/uoi";

type PolicyRow = Record<string, any>;
const PRODUCT_LABEL: Record<string, string> = {
  TR01: "Travel", HM01: "Home", MO01: "Motor", PA01: "Helper",
};
function pickId(p: PolicyRow): string {
  return (p?.PolicyNo || p?.PolicyId || p?.OrderId || p?.BusinessObjectId || "") + "";
}
function pickStatus(p: PolicyRow): string {
  return p?.Status || p?.PolicyStatus_CodeDesc || p?.PolicyStatus || "In Force";
}

export default function Policies() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [policies, setPolicies] = useState<PolicyRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setLoading(true); setError(null);
        const codes = ["TR01", "HM01", "MO01", "PA01"];
        const results = await Promise.all(codes.map((code) =>
          fetchOrderData<{ data?: PolicyRow[] } | PolicyRow[]>(
            { ProductCode: code, PageSize: 50, PageNo: 1 }, ac.signal,
          ).then((resp) => {
            const arr = Array.isArray(resp) ? resp : (resp?.data || []);
            return arr.map((p: PolicyRow) => ({ ...p, ProductCode: code }));
          }).catch(() => [] as PolicyRow[])
        ));
        const merged: PolicyRow[] = [];
        for (const lst of results) for (const p of lst) if (p && pickId(p)) merged.push(p);
        // Optionally enrich with findIssuedPolicies for additional metadata
        try {
          const issued = await findIssuedPolicies<{ data?: PolicyRow[] } | PolicyRow[]>({}, ac.signal);
          const arr = Array.isArray(issued) ? issued : (issued?.data || []);
          if (arr.length) console.log("findIssuedPolicies returned", arr.length, "rows");
        } catch (_e) {}
        setPolicies(merged);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        setError(e?.message || "Could not load policies.");
      } finally { setLoading(false); }
    })();
    return () => ac.abort();
  }, []);

  const handleViewPolicy = (policyNo: string) => navigate(`/policies/${encodeURIComponent(policyNo)}`);

  const grouped: Record<string, PolicyRow[]> = {};
  for (const p of policies) {
    const code = (p.ProductCode || "TR01").toString();
    (grouped[code] = grouped[code] || []).push(p);
  }

  return (
    <div className="h-screen flex flex-row overflow-hidden">
      <div className="hidden md:block"><Sidebar activeItem="Policies" /></div>
      <MobileSidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="shrink-0 flex items-center justify-between px-[16px] md:px-[24px] py-[12px] bg-white border-b border-[#000000]/[0.09]">
          <button className="md:hidden" onClick={() => setMobileMenuOpen(true)}>
            <Icon icon="material-symbols:menu" width={24} height={24} style={{ color: "#212121" }} />
          </button>
          <div className="hidden md:flex items-center gap-[20px] ml-auto">
            <button onClick={() => navigate("/faq")}>
              <Icon icon="carbon:help" width={24} height={24} style={{ color: "#212121" }} />
            </button>
            <Icon icon="material-symbols:notifications" width={24} height={24} style={{ color: "#212121" }} />
            <Icon icon="material-symbols:person" width={32} height={32} style={{ color: "#b3d1ff" }} />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-white bg-gradient-to-b from-[#005eb8]/[0.07] to-[#5c55eb]/[0.07]">
          <div className="p-[16px] md:p-[48px_32px_100px_32px] max-w-[980px] mx-auto space-y-[24px]">
            <div className="flex items-center gap-[4px]">
              <span className="text-[14px] text-[#212121] font-[Noto_Sans] cursor-pointer" onClick={() => navigate("/dashboard")}>Dashboard</span>
              <Icon icon="material-symbols:chevron-right" width={10} height={17} style={{ color: "#212121" }} />
              <span className="text-[14px] text-[#005eb8] font-[Noto_Sans]">Policies</span>
            </div>
            <h1 className="text-[24px] md:text-[32px] font-bold text-[#212121] font-[Noto_Sans]">My Policies</h1>
            {loading && <div className="rounded-[8px] bg-white border border-[#e5e5e5] p-[24px]"><p className="text-[#6e6e6e]">Loading your policies…</p></div>}
            {error && !loading && <div className="rounded-[8px] bg-[#fce4ec] border border-[#f8bbd0] p-[16px]"><p className="text-[#c62828] font-medium">Could not load policies.</p><p className="text-[#c62828] text-[14px] mt-[4px]">{error}</p></div>}
            {!loading && !error && policies.length === 0 && <div className="rounded-[8px] bg-white border border-[#e5e5e5] p-[24px] text-center"><p className="text-[#6e6e6e]">No policies found.</p></div>}
            {!loading && !error && Object.entries(grouped).map(([code, items]) => (
              <section key={code} className="rounded-[12px] bg-white border border-[#e5e5e5] overflow-hidden">
                <div className="px-[20px] py-[16px] bg-gradient-to-r from-[#005eb8]/[0.05] to-[#5c55eb]/[0.05] border-b border-[#e5e5e5] flex items-center justify-between">
                  <h2 className="text-[18px] font-semibold text-[#212121] font-[Noto_Sans]">{PRODUCT_LABEL[code] || code}</h2>
                  <span className="text-[12px] font-medium px-[10px] py-[2px] rounded-full bg-[#e8f5e9] text-[#2e7d32]">{items.length} {items.length === 1 ? "policy" : "policies"}</span>
                </div>
                <ul className="divide-y divide-[#e5e5e5]">
                  {items.slice(0, 10).map((p) => {
                    const id = pickId(p);
                    return (
                      <li key={id} className="p-[16px] md:p-[20px] flex items-center justify-between hover:bg-[#fafafa] cursor-pointer" onClick={() => handleViewPolicy(id)}>
                        <div>
                          <p className="text-[14px] md:text-[16px] text-[#212121] font-[Noto_Sans]">Policy No: {id}</p>
                          <p className="text-[12px] md:text-[14px] text-[#6e6e6e] font-[Noto_Sans] mt-[2px]">{pickStatus(p)} · {p.EffectiveDate || ""}</p>
                        </div>
                        <button className="px-[16px] py-[8px] rounded-[8px] bg-[#005eb8] text-white text-[14px] font-medium" onClick={(e) => { e.stopPropagation(); handleViewPolicy(id); }}>View Policy</button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

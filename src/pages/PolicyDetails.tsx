import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Icon } from "@iconify/react";
import Sidebar from "../components/Sidebar";
import MobileSidebar from "../components/MobileSidebar";
import { fetchOrderData, downloadPolicyDocument } from "@/api/uoi";

type Policy = Record<string, any>;

export default function PolicyDetails() {
  const navigate = useNavigate();
  const { policyNo: paramPolicyNo } = useParams<{ policyNo: string }>();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    if (!paramPolicyNo) { setLoading(false); setError("No policy number in URL."); return; }
    (async () => {
      try {
        setLoading(true); setError(null);
        const resp = await fetchOrderData<{ data?: Policy[] } | Policy[]>({ PolicyNo: paramPolicyNo }, ac.signal);
        const arr = Array.isArray(resp) ? resp : (resp?.data || []);
        const found = arr.find((p: Policy) => (p?.PolicyNo || p?.PolicyId) === paramPolicyNo) || arr[0] || null;
        setPolicy(found);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        setError(e?.message || "Could not load policy.");
      } finally { setLoading(false); }
    })();
    return () => ac.abort();
  }, [paramPolicyNo]);

  const customer = policy?.PolicyCustomerList?.[0] || {};
  const address = [customer.Block, customer.StreetName, customer.BuildingName, customer.UnitNo, customer.PostCode].filter(Boolean).join(", ");

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
        <main className="flex-1 overflow-y-auto bg-white">
          <div className="p-[16px] md:p-[48px_32px] max-w-[980px] mx-auto space-y-[20px]">
            <button onClick={() => navigate("/policies")} className="flex items-center gap-[4px] text-[14px] text-[#005eb8] font-[Noto_Sans]">
              <Icon icon="material-symbols:chevron-left" width={16} height={16} /><span>Back to Policies</span>
            </button>
            <h1 className="text-[24px] md:text-[32px] font-bold text-[#212121] font-[Noto_Sans]">Policy Details</h1>
            {loading && <div className="rounded-[8px] bg-white border border-[#e5e5e5] p-[24px]"><p className="text-[#6e6e6e]">Loading policy {paramPolicyNo}…</p></div>}
            {error && !loading && <div className="rounded-[8px] bg-[#fce4ec] border border-[#f8bbd0] p-[16px]"><p className="text-[#c62828] font-medium">Could not load policy.</p><p className="text-[#c62828] text-[14px] mt-[4px]">{error}</p></div>}
            {!loading && !error && policy && (
              <div className="space-y-[20px]">
                <section className="rounded-[12px] bg-white border border-[#e5e5e5] p-[20px] md:p-[24px] space-y-[12px]">
                  <h2 className="text-[18px] font-semibold text-[#212121] font-[Noto_Sans]">Policy Information</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-[12px]">
                    <Field label="Policy No" value={policy.PolicyNo || policy.PolicyId || paramPolicyNo} />
                    <Field label="Order ID" value={policy.OrderId || ""} />
                    <Field label="Status" value={policy.PolicyStatus_CodeDesc || policy.Status || "In Force"} />
                    <Field label="Effective Date" value={policy.EffectiveDate || ""} />
                    <Field label="Expiry Date" value={policy.ExpiryDate || ""} />
                    <Field label="Plan Code" value={policy.PlanCode || ""} />
                  </div>
                </section>
                <section className="rounded-[12px] bg-white border border-[#e5e5e5] p-[20px] md:p-[24px] space-y-[12px]">
                  <h2 className="text-[18px] font-semibold text-[#212121] font-[Noto_Sans]">Customer Information</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-[12px]">
                    <Field label="Customer Name" value={customer.CustomerName || ""} />
                    <Field label="ID Number" value={customer.IdNo || ""} />
                    <Field label="Date of Birth" value={customer.DateOfBirth || ""} />
                    <Field label="Mobile" value={customer.Mobile || ""} />
                    <Field label="Email" value={customer.Email || ""} />
                    <Field label="Address" value={address} />
                  </div>
                </section>
                <div className="flex flex-wrap gap-[12px]">
                  <button onClick={() => { const id = policy.PolicyNo || policy.PolicyId || paramPolicyNo || ""; window.open(downloadPolicyDocument(id), "_blank"); }} className="px-[20px] py-[10px] rounded-[8px] bg-[#005eb8] text-white text-[14px] font-semibold">Download Policy PDF</button>
                  <button onClick={() => { const id = policy.PolicyNo || policy.PolicyId || paramPolicyNo || ""; navigate(`/claims/new?policyNo=${encodeURIComponent(id)}`); }} className="px-[20px] py-[10px] rounded-[8px] border border-[#005eb8] text-[#005eb8] text-[14px] font-semibold">File a Claim</button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-[#f0f0f0] pb-[8px]">
      <p className="text-[12px] text-[#6e6e6e] font-[Noto_Sans]">{label}</p>
      <p className="text-[14px] md:text-[16px] text-[#212121] font-[Noto_Sans] mt-[2px]">{value || "—"}</p>
    </div>
  );
}

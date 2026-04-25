import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Icon } from "@iconify/react";
import Sidebar from "../components/Sidebar";
import MobileSidebar from "../components/MobileSidebar";
import { findIssuedPolicies, uploadDocument, sendEmail } from "@/api/uoi";

type Policy = Record<string, any>;

export default function Claims() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const preselectedPolicy = sp.get("policyNo") || "";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [policies, setPolicies] = useState<Policy[]>([]);
  const [policiesLoading, setPoliciesLoading] = useState<boolean>(true);
  const [policiesError, setPoliciesError] = useState<string | null>(null);

  const [policyId, setPolicyId] = useState<string>(preselectedPolicy);
  const [claimType, setClaimType] = useState<string>("Medical");
  const [description, setDescription] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setPoliciesLoading(true); setPoliciesError(null);
        const resp = await findIssuedPolicies<{ data?: Policy[] } | Policy[]>({}, ac.signal);
        const arr = Array.isArray(resp) ? resp : (resp?.data || []);
        setPolicies(arr.filter((p: Policy) => p && (p.PolicyNo || p.PolicyId)));
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        setPoliciesError(e?.message || "Could not load your policies.");
      } finally { setPoliciesLoading(false); }
    })();
    return () => ac.abort();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null); setSubmitSuccess(null);
    if (!policyId) { setSubmitError("Please select a policy."); return; }
    if (!file) { setSubmitError("Please attach a supporting document."); return; }
    try {
      setSubmitting(true);
      await uploadDocument(file, { claimType, policyId });
      await sendEmail({
        to: "claims@uoi.com.sg",
        subject: `New ${claimType} claim for policy ${policyId}`,
        body: description || `New ${claimType} claim filed for policy ${policyId}.`,
      });
      setSubmitSuccess("Claim submitted successfully — our team will be in touch.");
      setTimeout(() => navigate("/claims"), 1500);
    } catch (e: any) {
      setSubmitError(e?.message || "Could not submit claim.");
    } finally { setSubmitting(false); }
  }

  return (
    <div className="h-screen flex flex-row overflow-hidden">
      <div className="hidden md:block"><Sidebar activeItem="Claims" /></div>
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
          <div className="p-[16px] md:p-[48px_32px] max-w-[680px] mx-auto space-y-[20px]">
            <div className="flex items-center gap-[4px]">
              <span className="text-[14px] text-[#212121] font-[Noto_Sans] cursor-pointer" onClick={() => navigate("/dashboard")}>Dashboard</span>
              <Icon icon="material-symbols:chevron-right" width={10} height={17} style={{ color: "#212121" }} />
              <span className="text-[14px] text-[#005eb8] font-[Noto_Sans]">Submit Claim</span>
            </div>
            <h1 className="text-[24px] md:text-[32px] font-bold text-[#212121] font-[Noto_Sans]">Submit a Claim</h1>
            {submitSuccess && <div className="rounded-[8px] bg-[#e8f5e9] border border-[#c8e6c9] p-[16px]"><p className="text-[#2e7d32] font-medium">{submitSuccess}</p></div>}
            {submitError && <div className="rounded-[8px] bg-[#fce4ec] border border-[#f8bbd0] p-[16px]"><p className="text-[#c62828] font-medium">{submitError}</p></div>}
            <form onSubmit={handleSubmit} className="rounded-[12px] bg-white border border-[#e5e5e5] p-[20px] md:p-[24px] space-y-[16px]">
              <div className="space-y-[6px]">
                <label className="text-[14px] text-[#212121] font-[Noto_Sans]">Policy</label>
                {policiesLoading ? <p className="text-[14px] text-[#6e6e6e]">Loading your policies…</p>
                  : policiesError ? <p className="text-[14px] text-[#c62828]">{policiesError}</p>
                  : <select value={policyId} onChange={(e) => setPolicyId(e.target.value)} className="w-full px-[12px] py-[10px] rounded-[8px] border border-[#e5e5e5] text-[14px] font-[Noto_Sans]">
                      <option value="">Select a policy…</option>
                      {policies.map((p) => { const id = p.PolicyNo || p.PolicyId || p.OrderId || ""; return (<option key={id} value={id}>{id} — {p.ProductName || p.PlanCode || ""}</option>); })}
                    </select>
                }
              </div>
              <div className="space-y-[6px]">
                <label className="text-[14px] text-[#212121] font-[Noto_Sans]">Claim Type</label>
                <select value={claimType} onChange={(e) => setClaimType(e.target.value)} className="w-full px-[12px] py-[10px] rounded-[8px] border border-[#e5e5e5] text-[14px] font-[Noto_Sans]">
                  <option>Medical</option><option>Travel Disruption</option><option>Lost Baggage</option><option>Home Damage</option><option>Motor Accident</option><option>Other</option>
                </select>
              </div>
              <div className="space-y-[6px]">
                <label className="text-[14px] text-[#212121] font-[Noto_Sans]">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full px-[12px] py-[10px] rounded-[8px] border border-[#e5e5e5] text-[14px] font-[Noto_Sans]" placeholder="What happened?" />
              </div>
              <div className="space-y-[6px]">
                <label className="text-[14px] text-[#212121] font-[Noto_Sans]">Supporting Document</label>
                <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full px-[12px] py-[10px] rounded-[8px] border border-[#e5e5e5] text-[14px] font-[Noto_Sans]" />
                {file && <p className="text-[12px] text-[#6e6e6e]">Selected: {file.name} ({Math.round(file.size / 1024)} KB)</p>}
              </div>
              <div className="flex gap-[12px] pt-[8px]">
                <button type="button" onClick={() => navigate(-1)} className="px-[20px] py-[10px] rounded-[8px] border border-[#e5e5e5] text-[#212121] text-[14px] font-medium">Cancel</button>
                <button type="submit" disabled={submitting} className="px-[20px] py-[10px] rounded-[8px] bg-[#005eb8] text-white text-[14px] font-semibold disabled:opacity-60">{submitting ? "Submitting…" : "Submit Claim"}</button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}

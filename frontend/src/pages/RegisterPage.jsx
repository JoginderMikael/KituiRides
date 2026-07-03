/**
 * @fileoverview Page component for register page.
 */
import { useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FiCheckCircle } from "react-icons/fi";
import { register } from "../features/auth/authApi";
import { absoluteHomePath } from "../lib/auth";
import { useAuth } from "../hooks/useAuth";
import { apiClient } from "../lib/apiClient";
import {
  AuthCardLayout,
  AuthInputField,
  AuthPrimaryButton,
  AuthRoadScene,
  AuthSecondaryButton,
  AuthSelectField,
  BrandMark,
  PasswordField,
  StepIndicator,
  UploadCard
} from "../components/AuthUI";

const ACCOUNT_STEPS = [
  { value: 1, label: "Account Details", description: "Your personal information" },
  { value: 2, label: "Review & Submit", description: "Create your account" }
];

const DRIVER_STEPS = [
  { value: 1, label: "Account Details", description: "Your personal information" },
  { value: 2, label: "Document Upload", description: "Identity and driver documents" },
  { value: 3, label: "Vehicle Details", description: "Vehicle information for review" }
];

function AuthSidebar({ role, step }) {
  const steps = role === "DRIVER" ? DRIVER_STEPS : ACCOUNT_STEPS;
  return (
    <aside className="hidden min-h-[42rem] rounded-2xl border border-slate-200 bg-white p-8 shadow-[0_22px_55px_-40px_rgba(15,23,42,0.35)] lg:block">
      <BrandMark compact />
      <div className="mt-14">
        <h2 className="text-2xl font-bold tracking-tight text-slate-950">Join KituiRides</h2>
        <p className="mt-2 text-sm font-medium text-slate-500">Start your journey with us today.</p>
      </div>
      <div className="mt-10">
        <StepIndicator steps={steps} currentStep={Math.min(step, steps.length)} />
      </div>
      <div className="mt-16 rounded-2xl bg-emerald-50 p-5">
        <h3 className="text-sm font-bold text-slate-900">Why ride with us?</h3>
        <div className="mt-4 space-y-3 text-sm font-medium text-slate-600">
          {["Safe and secure rides", "Affordable fares", "Multiple payment options", "24/7 support"].map((item) => (
            <p key={item} className="flex items-center gap-2">
              <FiCheckCircle className="text-emerald-600" />
              {item}
            </p>
          ))}
        </div>
      </div>
      <p className="mt-10 text-sm text-slate-500">
        Already have an account?{" "}
        <Link to="/login" className="font-bold text-emerald-700">
          Sign In
        </Link>
      </p>
    </aside>
  );
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login: setAuth } = useAuth();
  const requestedRole = searchParams.get("role") === "DRIVER" ? "DRIVER" : "CUSTOMER";
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
    role: requestedRole,
    idNumber: "",
    licenseNumber: "",
    profilePhotoUrl: "",
    idFrontUrl: "",
    idBackUrl: "",
    licenseFrontUrl: "",
    licenseBackUrl: "",
    // Step 2
    carMake: "",
    carModel: "",
    carColor: "",
    plateNumber: "",
    engineSize: "",
    yearOfManufacture: "",
    isOwner: true,
    vehicleType: "CAR",
    carFrontUrl: "",
    carRearUrl: "",
    carInteriorUrl: "",
    insurancePhotoUrl: "",
    chassisPhotoUrl: ""
  });
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordMatch, setPasswordMatch] = useState(true);
  const passwordValid = form.password.length >= 8;
  const basicAccountDetailsComplete = [
    form.firstName,
    form.lastName,
    form.email,
    form.phoneNumber,
    form.password,
    form.confirmPassword
  ].every((value) => value.trim());
  const driverIdentityComplete = [
    form.idNumber,
    form.licenseNumber,
    form.profilePhotoUrl,
    form.idFrontUrl,
    form.idBackUrl,
    form.licenseFrontUrl,
    form.licenseBackUrl
  ].every((value) => String(value || "").trim());
  const driverVehicleDetailsComplete = [
    form.carMake,
    form.carModel,
    form.plateNumber,
    form.engineSize,
    form.yearOfManufacture,
    form.carFrontUrl,
    form.carRearUrl,
    form.carInteriorUrl,
    form.insurancePhotoUrl,
    form.chassisPhotoUrl
  ].every((value) => String(value || "").trim());
  const accountStepComplete = basicAccountDetailsComplete
    && passwordMatch
    && passwordValid
    && (form.role !== "DRIVER" || Boolean(form.profilePhotoUrl));
  const canSubmitRegistration = basicAccountDetailsComplete
    && passwordMatch
    && passwordValid
    && (form.role !== "DRIVER" || (driverIdentityComplete && driverVehicleDetailsComplete));

  const mutation = useMutation({
    mutationFn: async (data) => {
      const res = await register(data);
      if (data.role === "DRIVER") {
        await apiClient.post(
          "/driver/vehicle",
          {
            make: data.carMake,
            model: data.carModel,
            color: data.carColor,
            plateNumber: data.plateNumber,
            engineSize: parseInt(data.engineSize, 10),
            yearOfManufacture: parseInt(data.yearOfManufacture, 10),
            isOwner: data.isOwner,
            vehicleType: data.vehicleType,
            frontPhotoUrl: data.carFrontUrl,
            rearPhotoUrl: data.carRearUrl,
            interiorPhotoUrl: data.carInteriorUrl,
            insurancePhotoUrl: data.insurancePhotoUrl,
            chassisPhotoUrl: data.chassisPhotoUrl
          },
          {
            headers: {
              Authorization: `Bearer ${res.token}`
            }
          }
        );
      }
      return res;
    },
    onSuccess: (data) => {
      setAuth(data);
      window.location.assign(absoluteHomePath(data.role));
    }
  });

  useEffect(() => {
    if (form.role !== "DRIVER" && step !== 1) {
      setStep(1);
    }
  }, [form.role, step]);

  const currentStepLabel = useMemo(() => {
    if (form.role !== "DRIVER") {
      return "Step 1 of 2: Account Details";
    }
    if (step === 1) {
      return "Step 1 of 3: Account Details";
    }
    if (step === 2) {
      return "Step 2 of 3: Document Upload";
    }
    return "Step 3 of 3: Vehicle Details";
  }, [form.role, step]);

  const handlePasswordChange = (e) => {
    const pwd = e.target.value;
    setForm({ ...form, password: pwd });
    setPasswordMatch(pwd === form.confirmPassword);
  };

  const handleConfirmPasswordChange = (e) => {
    const confirmPwd = e.target.value;
    setForm({ ...form, confirmPassword: confirmPwd });
    setPasswordMatch(form.password === confirmPwd);
  };

  const submitRegistration = () => {
    mutation.mutate({
      ...form,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phoneNumber: form.phoneNumber.trim(),
      idNumber: form.idNumber.trim(),
      licenseNumber: form.licenseNumber.trim(),
      carMake: form.carMake.trim(),
      carModel: form.carModel.trim(),
      carColor: form.carColor.trim(),
      plateNumber: form.plateNumber.trim()
    });
  };

  const accountFields = (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <AuthInputField
          label="First Name"
          placeholder="First Name"
          value={form.firstName}
          onChange={(e) => setForm({ ...form, firstName: e.target.value })}
          required
        />
        <AuthInputField
          label="Last Name"
          placeholder="Last Name"
          value={form.lastName}
          onChange={(e) => setForm({ ...form, lastName: e.target.value })}
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <AuthInputField
          label="Email Address"
          type="email"
          placeholder="Email Address"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <AuthInputField
          label="Phone Number"
          type="tel"
          placeholder="Phone Number"
          value={form.phoneNumber}
          onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <PasswordField
          label="Password"
          value={form.password}
          onChange={handlePasswordChange}
          showPassword={showPassword}
          onToggle={() => setShowPassword(!showPassword)}
          required
          error={!passwordValid && form.password.length > 0 ? "Password must be at least 8 characters long" : ""}
        />
        <PasswordField
          label="Confirm Password"
          value={form.confirmPassword}
          onChange={handleConfirmPasswordChange}
          showPassword={showPassword}
          onToggle={() => setShowPassword(!showPassword)}
          required
          error={!passwordMatch ? "Passwords do not match" : ""}
        />
      </div>

      <AuthSelectField
        label="Account Type"
        value={form.role}
        onChange={(e) => setForm({ ...form, role: e.target.value })}
        required
      >
        <option value="CUSTOMER">Customer - Book Rides</option>
        <option value="DRIVER">Driver - Offer Rides</option>
      </AuthSelectField>

      <UploadCard
        label="Passport Sized Photo"
        onUpload={(url) => setForm({ ...form, profilePhotoUrl: url })}
        value={form.profilePhotoUrl}
        required={form.role === "DRIVER"}
      />
    </div>
  );

  const documentFields = (
    <div className="space-y-4">
      <AuthInputField
        label="ID Number"
        placeholder="ID Number"
        value={form.idNumber}
        onChange={(e) => setForm({ ...form, idNumber: e.target.value })}
        required
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <UploadCard label="ID Front Side" onUpload={(url) => setForm({ ...form, idFrontUrl: url })} value={form.idFrontUrl} required />
        <UploadCard label="ID Back Side" onUpload={(url) => setForm({ ...form, idBackUrl: url })} value={form.idBackUrl} required />
      </div>
      <AuthInputField
        label="License Number"
        placeholder="License Number"
        value={form.licenseNumber}
        onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
        required
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <UploadCard label="License Front" onUpload={(url) => setForm({ ...form, licenseFrontUrl: url })} value={form.licenseFrontUrl} required />
        <UploadCard label="License Rear" onUpload={(url) => setForm({ ...form, licenseBackUrl: url })} value={form.licenseBackUrl} required />
      </div>
    </div>
  );

  const vehicleFields = (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <AuthSelectField label="Vehicle Type" value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })} required>
          <option value="CAR">Car</option>
          <option value="MOTORCYCLE">Motorcycle</option>
        </AuthSelectField>
        <AuthInputField
          label="Vehicle Make"
          placeholder="Toyota"
          value={form.carMake}
          onChange={(e) => setForm({ ...form, carMake: e.target.value })}
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <AuthInputField
          label="Model"
          placeholder="Vitz"
          value={form.carModel}
          onChange={(e) => setForm({ ...form, carModel: e.target.value })}
          required
        />
        <AuthInputField
          label="Year"
          type="number"
          placeholder="2015"
          value={form.yearOfManufacture}
          onChange={(e) => setForm({ ...form, yearOfManufacture: e.target.value })}
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <AuthInputField
          label="Color"
          placeholder="Green"
          value={form.carColor}
          onChange={(e) => setForm({ ...form, carColor: e.target.value })}
        />
        <AuthInputField
          label="License Plate Number"
          placeholder="KAA 001A"
          value={form.plateNumber}
          onChange={(e) => setForm({ ...form, plateNumber: e.target.value })}
          required
        />
      </div>
      <AuthInputField
        label="Engine Size (cc)"
        type="number"
        placeholder="1500"
        value={form.engineSize}
        onChange={(e) => setForm({ ...form, engineSize: e.target.value })}
        required
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <UploadCard label="Front Photo" onUpload={(url) => setForm({ ...form, carFrontUrl: url })} value={form.carFrontUrl} required />
        <UploadCard label="Rear Photo" onUpload={(url) => setForm({ ...form, carRearUrl: url })} value={form.carRearUrl} required />
        <UploadCard label="Interior Photo" onUpload={(url) => setForm({ ...form, carInteriorUrl: url })} value={form.carInteriorUrl} required />
        <UploadCard label="Insurance Sticker" onUpload={(url) => setForm({ ...form, insurancePhotoUrl: url })} value={form.insurancePhotoUrl} required />
      </div>
      <UploadCard label="Chassis Number Photo" onUpload={(url) => setForm({ ...form, chassisPhotoUrl: url })} value={form.chassisPhotoUrl} required />

      <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700">
        <input
          type="checkbox"
          checked={form.isOwner}
          onChange={(e) => setForm({ ...form, isOwner: e.target.checked })}
          id="isOwner"
          className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
        />
        I am the owner of this vehicle
      </label>
    </div>
  );

  return (
    <AuthCardLayout
      wide
      aside={<AuthSidebar role={form.role} step={step} />}
    >
      <section className="w-full max-w-3xl rounded-2xl bg-white p-5 shadow-[0_22px_55px_-36px_rgba(15,23,42,0.45)] ring-1 ring-slate-200 sm:p-8">
        <div className="mb-7 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-6 lg:hidden">
              <BrandMark />
              <img
                src="/landing/kituirides-hero-scene.png"
                alt=""
                className="mx-auto mt-5 h-28 w-full object-contain"
              />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">{currentStepLabel}</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Create Your Account</h1>
            <p className="mt-2 text-sm font-medium text-slate-500">Start your journey with us today.</p>
          </div>
          <div className="lg:hidden">
            <StepIndicator steps={form.role === "DRIVER" ? DRIVER_STEPS : ACCOUNT_STEPS} currentStep={Math.min(step, form.role === "DRIVER" ? 3 : 1)} />
          </div>
        </div>

        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (form.role === "DRIVER" && step !== 3) {
              return;
            }
            if (!canSubmitRegistration) {
              return;
            }
            submitRegistration();
          }}
        >
          {step === 1 ? accountFields : null}
          {form.role === "DRIVER" && step === 2 ? documentFields : null}
          {form.role === "DRIVER" && step === 3 ? vehicleFields : null}

          {mutation.isError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
              {mutation.error?.response?.data?.message || "Registration failed. Please check your details and try again."}
            </div>
          )}

          <div className="grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-2">
            {form.role === "DRIVER" && step > 1 ? (
              <AuthSecondaryButton type="button" onClick={() => setStep((current) => Math.max(1, current - 1))}>
                Back
              </AuthSecondaryButton>
            ) : (
              <Link
                to="/login"
                className="flex h-12 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Already have an account?
              </Link>
            )}

            {form.role === "DRIVER" && step === 1 ? (
              <AuthPrimaryButton type="button" onClick={() => setStep(2)} disabled={!accountStepComplete}>
                Next: Documents
              </AuthPrimaryButton>
            ) : null}
            {form.role === "DRIVER" && step === 2 ? (
              <AuthPrimaryButton type="button" onClick={() => setStep(3)} disabled={!driverIdentityComplete}>
                Next: Vehicle Details
              </AuthPrimaryButton>
            ) : null}
            {form.role !== "DRIVER" || step === 3 ? (
              <AuthPrimaryButton type="submit" loading={mutation.isPending} disabled={!canSubmitRegistration}>
                {form.role === "DRIVER" ? "Submit for Review" : "Create Account"}
              </AuthPrimaryButton>
            ) : null}
          </div>
        </form>
      </section>
    </AuthCardLayout>
  );
}

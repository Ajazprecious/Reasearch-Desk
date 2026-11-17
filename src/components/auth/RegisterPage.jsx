import { useEffect, useState } from "react";
import { localClient } from "@/api/localClient";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthError, AuthLink, SubmitButton } from "@/components/auth/parts";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { safeReturnTo } from "@/lib/authReturnTo";
import { readIntendedRole, rememberIntendedRole } from "@/lib/intendedRole";

const FACULTIES = ["Faculty of Graduate Studies", "Faculty of Science", "Faculty of Social Sciences", "Faculty of Management Sciences", "Faculty of Arts"];
const DEPARTMENTS = ["Information Management Systems", "Information Technology", "Computer Science", "Economics", "Business Administration", "Other"];
const PROGRAMMES = ["MSc", "MA", "MPhil", "PhD", "Other"];
const RANKS = ["Assistant Lecturer", "Lecturer II", "Lecturer I", "Senior Lecturer", "Associate Professor", "Professor"];
const OFFICES = ["Postgraduate School", "Faculty Office", "Department Office", "Research Office"];

function RegistrationField({ id, label, value, onChange, placeholder, type = "text", options, required = true, disabled = false, min }) {
  const controlClass = "rd-auth-control";
  return (
    <div className="rd-auth-field">
      <Label htmlFor={id}>{label}</Label>
      {options ? (
        <select
          id={id}
          className={controlClass}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          disabled={disabled}
        >
          <option value="" disabled>{placeholder}</option>
          {options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      ) : (
        <Input
          id={id}
          type={type}
          autoComplete={type === "email" ? "email" : undefined}
          className={controlClass}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          min={min}
          minLength={type === "password" ? 8 : undefined}
        />
      )}
    </div>
  );
}

export function RegisterPage() {
  const returnTo = safeReturnTo();
  const [role, setRole] = useState("student");
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    identifier: "",
    program: "",
    faculty: "",
    department: "",
    office: "",
    scope: "",
    authorisedUnit: "",
    rank: "",
    capacity: "",
    expertise: "",
    invitationCode: "",
    password: "",
    confirm: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const stored = readIntendedRole();
    if (stored) setRole(stored);
  }, []);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function register(event) {
    event.preventDefault();
    setError("");
    if (isStudent && form.password !== form.confirm) {
      setError("Passwords do not match");
      return;
    }
    setBusy(true);
    rememberIntendedRole(role);
    try {
      const result = await localClient.auth.register({
        email: form.email,
        password: form.password,
        role,
        full_name: form.fullName,
        identifier: form.identifier,
        program: form.program,
        faculty: form.faculty,
        department: role === "admin" ? form.authorisedUnit : form.department,
        administrative_office: form.office,
        administrative_scope: form.scope,
        authorised_unit: form.authorisedUnit,
        academic_rank: form.rank,
        supervision_capacity: Number(form.capacity),
        expertise: form.expertise,
        invitation_code: form.invitationCode,
      });
      if (result?.access_token) localClient.auth.setToken(result.access_token);
      window.location.href = returnTo;
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  const isStudent = role === "student";
  const isSupervisor = role === "supervisor";
  const title = isStudent
    ? "Create your student account"
    : isSupervisor
      ? "Create your supervisor account"
      : "Create administrator account";
  const subtitle = isStudent
    ? "Use your academic details to create your ResearchDesk student workspace."
    : isSupervisor
      ? "Set up your supervisor profile for research matching, feedback and student progress monitoring."
      : "Administrator access is restricted to authorised institutional staff.";

  return (
    <AuthLayout
      title={title}
      subtitle={subtitle}
      cardSize="wide"
      tagline={isSupervisor ? "Manage your research work in one place." : "Everything your research needs, connected."}
      description={isSupervisor
        ? "Manage supervisor assignment, writing, drafts, feedback, milestones and progress in one workspace."
        : "Write, collaborate, submit, review and track progress from research setup to defence."}
      footer={
        <div className="rd-auth-register-footer">
          <span>
            Already registered?{" "}
            <AuthLink to="/login" returnTo={returnTo}>Sign in</AuthLink>
          </span>
          <span>ResearchDesk • Research Workspace</span>
        </div>
      }
    >
      <AuthError>{error}</AuthError>
      <form onSubmit={register} className="rd-auth-form">
        <div className="rd-auth-form-grid">
          <RegistrationField
            id="register-full-name"
            label={isSupervisor ? "Title & full name" : "Full name"}
            value={form.fullName}
            onChange={(value) => update("fullName", value)}
            placeholder={isSupervisor ? "e.g. Dr. Amina Yusuf" : isStudent ? "e.g. Amara Nwosu" : "e.g. Postgraduate Admin"}
          />
          <RegistrationField
            id="register-email"
            label="Institutional email"
            type="email"
            value={form.email}
            onChange={(value) => update("email", value)}
            placeholder={role === "admin" ? "admin@institution.edu.ng" : "name@institution.edu.ng"}
          />

          {role !== "admin" ? (
            <>
              <RegistrationField
                id="register-identifier"
                label={isStudent ? "Matric / Registration number" : "Staff ID"}
                value={form.identifier}
                onChange={(value) => update("identifier", value)}
                placeholder={isStudent ? "e.g. MIT/IMS/2026/014" : "Enter staff ID"}
              />
              {isStudent ? (
                <RegistrationField
                  id="register-program"
                  label="Programme"
                  value={form.program}
                  onChange={(value) => update("program", value)}
                  placeholder="Select programme"
                  options={PROGRAMMES}
                />
              ) : (
                <RegistrationField
                  id="register-rank"
                  label="Academic rank"
                  value={form.rank}
                  onChange={(value) => update("rank", value)}
                  placeholder="Select rank"
                  options={RANKS}
                />
              )}
              <RegistrationField
                id="register-faculty"
                label="Faculty / School"
                value={form.faculty}
                onChange={(value) => update("faculty", value)}
                placeholder="Select faculty"
                options={FACULTIES}
              />
              <RegistrationField
                id="register-department"
                label="Department"
                value={form.department}
                onChange={(value) => update("department", value)}
                placeholder="Select department"
                options={DEPARTMENTS}
              />
              {isSupervisor && (
                <RegistrationField
                  id="register-capacity"
                  label="Supervision capacity"
                  type="number"
                  min="1"
                  value={form.capacity}
                  onChange={(value) => update("capacity", value)}
                  placeholder="e.g. 8 students"
                />
              )}
              <RegistrationField
                id="register-password"
                label="Password"
                type="password"
                value={form.password}
                onChange={(value) => update("password", value)}
                placeholder="Create password"
              />
              {isStudent && (
                <RegistrationField
                  id="register-confirm"
                  label="Confirm password"
                  type="password"
                  value={form.confirm}
                  onChange={(value) => update("confirm", value)}
                  placeholder="Repeat password"
                />
              )}
            </>
          ) : (
            <>
              <RegistrationField
                id="register-staff-id"
                label="Staff ID"
                value={form.identifier}
                onChange={(value) => update("identifier", value)}
                placeholder="Enter staff ID"
              />
              <RegistrationField
                id="register-office"
                label="Administrative office"
                value={form.office}
                onChange={(value) => update("office", value)}
                placeholder="Select office"
                options={OFFICES}
              />
              <RegistrationField
                id="register-scope"
                label="Administrative scope"
                value={form.scope}
                onChange={(value) => update("scope", value)}
                placeholder="Institution / Faculty / Dept."
                options={["Institution", "Faculty", "Department"]}
              />
              <RegistrationField
                id="register-authorised-unit"
                label="Authorised unit"
                value={form.authorisedUnit}
                onChange={(value) => update("authorisedUnit", value)}
                placeholder="Select faculty or department"
                options={[...FACULTIES, ...DEPARTMENTS]}
              />
              <RegistrationField
                id="register-invitation-code"
                label="Invitation / approval code"
                value={form.invitationCode}
                onChange={(value) => update("invitationCode", value)}
                placeholder="Enter institution-issued code"
              />
              <RegistrationField
                id="register-admin-password"
                label="Password"
                type="password"
                value={form.password}
                onChange={(value) => update("password", value)}
                placeholder="Create password"
              />
            </>
          )}
        </div>

        {isSupervisor && (
          <>
            <div className="rd-auth-field rd-auth-full-field">
              <Label htmlFor="register-expertise">Research / supervision expertise</Label>
              <textarea
                id="register-expertise"
                className="rd-auth-control rd-auth-textarea"
                value={form.expertise}
                onChange={(event) => update("expertise", event.target.value)}
                placeholder="e.g. Information systems, HCI, digital transformation, knowledge management"
                required
              />
            </div>
            <div className="rd-auth-notice rd-auth-notice-info" role="status">
              <strong>Staff verification</strong>
              <span>Supervisor accounts remain pending until your institution verifies the staff profile, department and supervision details.</span>
            </div>
          </>
        )}
        {isStudent && (
          <div className="rd-auth-notice rd-auth-notice-info" role="status">
            <strong>Department-based supervision</strong>
            <span>Your department determines the academic supervision pool used for supervisor recommendation and reporting.</span>
          </div>
        )}
        {role === "admin" && (
          <div className="rd-auth-notice rd-auth-notice-warning" role="status">
            <strong>Restricted registration</strong>
            <span>Administrator access requires an institution-issued invitation or approval code. Public self-registration does not grant administrative access.</span>
          </div>
        )}

        <SubmitButton busy={busy} busyLabel="Creating account...">
          Create {role === "admin" ? "administrator" : role} account
        </SubmitButton>
      </form>
    </AuthLayout>
  );
}

import React, { useMemo, useState } from "react";
import Toast from "react-native-toast-message";
import {
	View,
	Text,
	ScrollView,
	TouchableOpacity,
	TextInput,
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker, {
	DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../../../redux/store";
import { setUser } from "../../../redux/userSlice";
import useTheme from "../../../Hooks/useTheme";
import createStyles from "./EditProfile.styles";
import { editUser, EditUserPayload } from "../../../services/userAuthServices/editUser";
import { patchData } from "../../../utils/authStorage";

type Props = {
	navigation: any;
};

const EditProfileScreen: React.FC<Props> = ({ navigation }) => {
	const { colors } = useTheme();
	const styles = useMemo(() => createStyles(colors), [colors]);
	const dispatch = useDispatch<AppDispatch>();
	const user = useSelector((state: RootState) => state.user.data);

	const [username, setUsername] = useState(user?.username ?? "");
	const [email, setEmail] = useState(user?.email ?? "");
	const [gender, setGender] = useState<"male" | "female" | "">(
		user?.gender === "male" || user?.gender === "female" ? user.gender : "",
	);

	const initialBirth = user?.birth_day
		? new Date(user.birth_day)
		: new Date(2000, 0, 1);

	const [birthDay, setBirthDay] = useState<Date>(initialBirth);
	const [showDatePicker, setShowDatePicker] = useState(false);
	const [saving, setSaving] = useState(false);
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);

	const birthDayLabel = birthDay.toISOString().slice(0, 10);

	const validate = () => {
		const next: Record<string, string> = {};
		if (!username.trim()) next.username = "Username is required";
		if (!email.trim()) next.email = "Email is required";
		if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			next.email = "Enter a valid email";
		}
		if (!gender) next.gender = "Select gender";
		if (password && password.length < 8) {
			next.password = "Password must be at least 8 characters";
		}
		setErrors(next);
		return Object.keys(next).length === 0;
	};

	const onChangeDate = (_event: DateTimePickerEvent, selected?: Date) => {
		setShowDatePicker(false);
		if (selected) {
			setBirthDay(selected);
		}
	};

	const onSave = async () => {
		if (!validate() || !user) return;

		try {
			setSaving(true);

			const payload: EditUserPayload = {
				id: user.id,
				username: username.trim(),
				email: email.trim(),
				gender: gender || undefined,
				birth_day: birthDayLabel,
			};

			if (password.trim()) {
				payload.password = password;
			}

			const res = await editUser(payload);

			if (!res.success || !res.user) {
				const error = res.error || {};
				const nextErrors: Record<string, string> = {};
				if (error?.username)
					nextErrors.username = error.username[0] || "Username error";
				if (error?.email)
					nextErrors.email = error.email[0] || "Email error";
				if (error?.password)
					nextErrors.password = error.password[0] || "Password error";
				if (error?.gender)
					nextErrors.gender = error.gender[0] || "Gender error";
				if (error?.birth_day)
					nextErrors.birth_day = error.birth_day[0] || "Birth date error";
				setErrors(nextErrors);

				Toast.show({
					type: "error",
					text1: "Update failed",
					text2: res.message || "Could not update profile",
					position: "top",
					visibilityTime: 2000,
					autoHide: true,
				});
				return;
			}

			dispatch(setUser(res.user));
			await patchData({ user: res.user });
			Toast.show({
				type: "success",
				text1: "Profile updated",
				text2: "Your profile has been saved.",
				position: "top",
				visibilityTime: 2000,
				autoHide: true,
			});
			navigation.goBack();
		} catch {
			Toast.show({
				type: "error",
				text1: "Error",
				text2: "Something went wrong while saving.",
				position: "top",
				visibilityTime: 2000,
				autoHide: true,
			});
		} finally {
			setSaving(false);
		}
	};

	const isSaveDisabled = saving;

	return (
		<SafeAreaView style={styles.safe}>
			<KeyboardAvoidingView
				style={styles.keyboardContainer}
				behavior={Platform.OS === "ios" ? "padding" : undefined}
			>
				<View style={styles.header}>
					<TouchableOpacity
						style={styles.backButton}
						onPress={() => navigation.goBack()}
					>
						<Text style={styles.backText}>{"<"}</Text>
					</TouchableOpacity>
					<Text style={styles.headerTitle}>Edit Profile</Text>
				</View>

				<ScrollView
					style={styles.content}
					keyboardShouldPersistTaps="handled"
				>
					<View style={styles.card}>
						<Text style={styles.sectionTitle}>Basic info</Text>

						<Text style={styles.fieldLabel}>Username</Text>
						<TextInput
							style={styles.input}
							value={username}
							onChangeText={setUsername}
							placeholder="Your username"
							placeholderTextColor={colors.secondaryText}
							autoCapitalize="none"
						/>
						{errors.username ? (
							<Text style={styles.errorText}>{errors.username}</Text>
						) : null}

						<Text style={styles.fieldLabel}>Email</Text>
						<TextInput
							style={styles.input}
							value={email}
							onChangeText={setEmail}
							placeholder="you@example.com"
							placeholderTextColor={colors.secondaryText}
							keyboardType="email-address"
							autoCapitalize="none"
						/>
						{errors.email ? (
							<Text style={styles.errorText}>{errors.email}</Text>
						) : null}

						<Text style={styles.fieldLabel}>New password</Text>
						<View style={styles.passwordContainer}>
							<TextInput
								style={[styles.input, styles.passwordInput]}
								value={password}
								onChangeText={setPassword}
								placeholder="Enter new password"
								placeholderTextColor={colors.secondaryText}
								secureTextEntry={!showPassword}
								autoCapitalize="none"
							/>
							<TouchableOpacity
								onPress={() => setShowPassword(prev => !prev)}
								style={styles.togglePasswordButton}
								activeOpacity={0.7}
							>
								<Text style={styles.togglePasswordText}>
									{showPassword ? "Hide" : "Show"}
								</Text>
							</TouchableOpacity>
						</View>
						{errors.password ? (
							<Text style={styles.errorText}>{errors.password}</Text>
						) : null}

						<Text style={styles.fieldLabel}>Gender</Text>
						<View style={styles.genderRow}>
							<TouchableOpacity
								style={[
									styles.genderChip,
									{
										backgroundColor:
											gender === "male" ? colors.primary : colors.background,
										borderColor:
											gender === "male" ? colors.primary : colors.border,
									},
								]}
								onPress={() => setGender("male")}
							>
								<Text
									style={[
										styles.genderChipText,
										{
											color:
												gender === "male" ? colors.primaryText : colors.text,
										},
									]}
								>
									Male
								</Text>
							</TouchableOpacity>

							<TouchableOpacity
								style={[
									styles.genderChip,
									{
										backgroundColor:
											gender === "female" ? colors.primary : colors.background,
										borderColor:
											gender === "female" ? colors.primary : colors.border,
									},
								]}
								onPress={() => setGender("female")}
							>
								<Text
									style={[
										styles.genderChipText,
										{
											color:
												gender === "female" ? colors.primaryText : colors.text,
										},
									]}
								>
									Female
								</Text>
							</TouchableOpacity>
						</View>
						{errors.gender ? (
							<Text style={styles.errorText}>{errors.gender}</Text>
						) : null}

						<Text style={styles.fieldLabel}>Birthday</Text>
						<TouchableOpacity
							onPress={() => setShowDatePicker(true)}
							activeOpacity={0.8}
						>
							<Text style={styles.birthdayValue}>{birthDayLabel}</Text>
						</TouchableOpacity>
						<Text style={styles.dateHint}>Format: YYYY-MM-DD</Text>

						{showDatePicker && (
							<DateTimePicker
								value={birthDay}
								mode="date"
								display={Platform.OS === "ios" ? "spinner" : "default"}
								onChange={onChangeDate}
							/>
						)}
					</View>
				</ScrollView>

				<View style={styles.footer}>
					<TouchableOpacity
						style={[
							styles.saveButton,
							isSaveDisabled && styles.saveButtonDisabled,
						]}
						disabled={isSaveDisabled}
						onPress={onSave}
					>
						{saving ? (
							<ActivityIndicator color={colors.primaryText} />
						) : (
							<Text style={styles.saveText}>Save changes</Text>
						)}
					</TouchableOpacity>

					{saving && (
						<View style={styles.loadingRow}>
							<ActivityIndicator size="small" color={colors.secondaryText} />
							<Text style={styles.loadingText}>Updating profile…</Text>
						</View>
					)}
				</View>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
};

export default EditProfileScreen;


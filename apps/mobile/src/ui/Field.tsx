import { useState, type ReactNode } from "react";
import {
  Pressable,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type TextInputProps,
} from "react-native";
import { FONT, RADIUS, SPACING } from "./tokens";
import { useColorTokens } from "./useColorTokens";
import { Eye, EyeOff } from "./icons";

const BRAND = "#059669";

/**
 * Campo "boxed" com label acima — paridade com o labeledField do app Swift
 * (LoginView.swift): card bg, borda que vira verde + sombra no foco.
 * Mantém o toggle de "mostrar senha" (olho) que o RN já tinha de bom.
 */
type Props = {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoComplete?: TextInputProps["autoComplete"];
  textContentType?: TextInputProps["textContentType"];
  autoCapitalize?: TextInputProps["autoCapitalize"];
  editable?: boolean;
  returnKeyType?: TextInputProps["returnKeyType"];
  onSubmitEditing?: () => void;
  rightSlot?: ReactNode;
};

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType,
  autoComplete,
  textContentType,
  autoCapitalize,
  editable = true,
  returnKeyType,
  onSubmitEditing,
  rightSlot,
}: Props) {
  const t = useColorTokens();
  const [focused, setFocused] = useState(false);
  const [showSecure, setShowSecure] = useState(false);
  const isSecure = secureTextEntry && !showSecure;

  return (
    <View style={{ gap: SPACING.xxs }}>
      <Text
        style={{
          fontFamily: FONT.medium,
          fontSize: 14,
          color: t.text,
        }}
      >
        {label}
      </Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          minHeight: 48,
          paddingHorizontal: SPACING.md,
          borderRadius: RADIUS.xl,
          backgroundColor: t.card,
          borderWidth: 1.5,
          borderColor: focused ? BRAND : t.separator,
          ...(focused
            ? {
                shadowColor: BRAND,
                shadowOpacity: 0.16,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 0 },
                elevation: 2,
              }
            : null),
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={t.textMute}
          secureTextEntry={isSecure}
          keyboardType={keyboardType}
          autoComplete={autoComplete}
          textContentType={textContentType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          editable={editable}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          selectionColor={BRAND}
          cursorColor={BRAND}
          style={{
            flex: 1,
            fontFamily: FONT.body,
            fontSize: 16,
            color: t.text,
            paddingVertical: 12,
            // @ts-expect-error — outline* só existe no Expo Web, no-op no nativo.
            outlineStyle: "none",
          }}
        />
        {secureTextEntry ? (
          <Pressable
            onPress={() => setShowSecure((v) => !v)}
            hitSlop={8}
            accessibilityLabel={showSecure ? "Esconder senha" : "Mostrar senha"}
          >
            {showSecure ? (
              <EyeOff size={18} color={t.textMute} />
            ) : (
              <Eye size={18} color={t.textMute} />
            )}
          </Pressable>
        ) : (
          rightSlot
        )}
      </View>
    </View>
  );
}

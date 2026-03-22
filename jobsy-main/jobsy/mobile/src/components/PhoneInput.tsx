import { useState, useMemo, useCallback } from "react";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants/theme";

// ── Country data (matches website PhoneInput) ──────────────────────────
interface CountryEntry {
  code: string;
  flag: string;
  name: string;
  digits: number;
}

const COUNTRY_CODES: CountryEntry[] = [
  // Jamaica first (default)
  { code: "+1876", flag: "\u{1F1EF}\u{1F1F2}", name: "Jamaica (+1876)", digits: 7 },
  { code: "+1658", flag: "\u{1F1EF}\u{1F1F2}", name: "Jamaica (+1658)", digits: 7 },
  // Caribbean
  { code: "+1268", flag: "\u{1F1E6}\u{1F1EC}", name: "Antigua & Barbuda", digits: 7 },
  { code: "+1264", flag: "\u{1F1E6}\u{1F1EE}", name: "Anguilla", digits: 7 },
  { code: "+297", flag: "\u{1F1E6}\u{1F1FC}", name: "Aruba", digits: 7 },
  { code: "+1242", flag: "\u{1F1E7}\u{1F1F8}", name: "Bahamas", digits: 7 },
  { code: "+1246", flag: "\u{1F1E7}\u{1F1E7}", name: "Barbados", digits: 7 },
  { code: "+1441", flag: "\u{1F1E7}\u{1F1F2}", name: "Bermuda", digits: 7 },
  { code: "+1284", flag: "\u{1F1FB}\u{1F1EC}", name: "British Virgin Islands", digits: 7 },
  { code: "+1345", flag: "\u{1F1F0}\u{1F1FE}", name: "Cayman Islands", digits: 7 },
  { code: "+599", flag: "\u{1F1E8}\u{1F1FC}", name: "Cura\u00E7ao", digits: 7 },
  { code: "+1767", flag: "\u{1F1E9}\u{1F1F2}", name: "Dominica", digits: 7 },
  { code: "+1809", flag: "\u{1F1E9}\u{1F1F4}", name: "Dominican Republic", digits: 7 },
  { code: "+1473", flag: "\u{1F1EC}\u{1F1E9}", name: "Grenada", digits: 7 },
  { code: "+590", flag: "\u{1F1EC}\u{1F1F5}", name: "Guadeloupe", digits: 9 },
  { code: "+592", flag: "\u{1F1EC}\u{1F1FE}", name: "Guyana", digits: 7 },
  { code: "+509", flag: "\u{1F1ED}\u{1F1F9}", name: "Haiti", digits: 8 },
  { code: "+596", flag: "\u{1F1F2}\u{1F1F6}", name: "Martinique", digits: 9 },
  { code: "+1664", flag: "\u{1F1F2}\u{1F1F8}", name: "Montserrat", digits: 7 },
  { code: "+1787", flag: "\u{1F1F5}\u{1F1F7}", name: "Puerto Rico", digits: 7 },
  { code: "+1869", flag: "\u{1F1F0}\u{1F1F3}", name: "St. Kitts & Nevis", digits: 7 },
  { code: "+1758", flag: "\u{1F1F1}\u{1F1E8}", name: "Saint Lucia", digits: 7 },
  { code: "+1784", flag: "\u{1F1FB}\u{1F1E8}", name: "St. Vincent", digits: 7 },
  { code: "+597", flag: "\u{1F1F8}\u{1F1F7}", name: "Suriname", digits: 7 },
  { code: "+1868", flag: "\u{1F1F9}\u{1F1F9}", name: "Trinidad & Tobago", digits: 7 },
  { code: "+1649", flag: "\u{1F1F9}\u{1F1E8}", name: "Turks & Caicos", digits: 7 },
  { code: "+1340", flag: "\u{1F1FB}\u{1F1EE}", name: "U.S. Virgin Islands", digits: 7 },
  // North America
  { code: "+1", flag: "\u{1F1FA}\u{1F1F8}", name: "United States", digits: 10 },
  { code: "+1", flag: "\u{1F1E8}\u{1F1E6}", name: "Canada", digits: 10 },
  { code: "+52", flag: "\u{1F1F2}\u{1F1FD}", name: "Mexico", digits: 10 },
  // Central America
  { code: "+501", flag: "\u{1F1E7}\u{1F1FF}", name: "Belize", digits: 7 },
  { code: "+506", flag: "\u{1F1E8}\u{1F1F7}", name: "Costa Rica", digits: 8 },
  { code: "+503", flag: "\u{1F1F8}\u{1F1FB}", name: "El Salvador", digits: 8 },
  { code: "+502", flag: "\u{1F1EC}\u{1F1F9}", name: "Guatemala", digits: 8 },
  { code: "+504", flag: "\u{1F1ED}\u{1F1F3}", name: "Honduras", digits: 8 },
  { code: "+505", flag: "\u{1F1F3}\u{1F1EE}", name: "Nicaragua", digits: 8 },
  { code: "+507", flag: "\u{1F1F5}\u{1F1E6}", name: "Panama", digits: 8 },
  // South America
  { code: "+54", flag: "\u{1F1E6}\u{1F1F7}", name: "Argentina", digits: 10 },
  { code: "+591", flag: "\u{1F1E7}\u{1F1F4}", name: "Bolivia", digits: 8 },
  { code: "+55", flag: "\u{1F1E7}\u{1F1F7}", name: "Brazil", digits: 11 },
  { code: "+56", flag: "\u{1F1E8}\u{1F1F1}", name: "Chile", digits: 9 },
  { code: "+57", flag: "\u{1F1E8}\u{1F1F4}", name: "Colombia", digits: 10 },
  { code: "+593", flag: "\u{1F1EA}\u{1F1E8}", name: "Ecuador", digits: 9 },
  { code: "+595", flag: "\u{1F1F5}\u{1F1FE}", name: "Paraguay", digits: 9 },
  { code: "+51", flag: "\u{1F1F5}\u{1F1EA}", name: "Peru", digits: 9 },
  { code: "+598", flag: "\u{1F1FA}\u{1F1FE}", name: "Uruguay", digits: 8 },
  { code: "+58", flag: "\u{1F1FB}\u{1F1EA}", name: "Venezuela", digits: 10 },
  // Europe
  { code: "+44", flag: "\u{1F1EC}\u{1F1E7}", name: "United Kingdom", digits: 10 },
  { code: "+353", flag: "\u{1F1EE}\u{1F1EA}", name: "Ireland", digits: 9 },
  { code: "+33", flag: "\u{1F1EB}\u{1F1F7}", name: "France", digits: 9 },
  { code: "+49", flag: "\u{1F1E9}\u{1F1EA}", name: "Germany", digits: 11 },
  { code: "+39", flag: "\u{1F1EE}\u{1F1F9}", name: "Italy", digits: 10 },
  { code: "+34", flag: "\u{1F1EA}\u{1F1F8}", name: "Spain", digits: 9 },
  { code: "+351", flag: "\u{1F1F5}\u{1F1F9}", name: "Portugal", digits: 9 },
  { code: "+31", flag: "\u{1F1F3}\u{1F1F1}", name: "Netherlands", digits: 9 },
  { code: "+32", flag: "\u{1F1E7}\u{1F1EA}", name: "Belgium", digits: 9 },
  { code: "+41", flag: "\u{1F1E8}\u{1F1ED}", name: "Switzerland", digits: 9 },
  { code: "+43", flag: "\u{1F1E6}\u{1F1F9}", name: "Austria", digits: 10 },
  { code: "+46", flag: "\u{1F1F8}\u{1F1EA}", name: "Sweden", digits: 9 },
  { code: "+47", flag: "\u{1F1F3}\u{1F1F4}", name: "Norway", digits: 8 },
  { code: "+45", flag: "\u{1F1E9}\u{1F1F0}", name: "Denmark", digits: 8 },
  { code: "+358", flag: "\u{1F1EB}\u{1F1EE}", name: "Finland", digits: 10 },
  { code: "+48", flag: "\u{1F1F5}\u{1F1F1}", name: "Poland", digits: 9 },
  { code: "+420", flag: "\u{1F1E8}\u{1F1FF}", name: "Czech Republic", digits: 9 },
  { code: "+421", flag: "\u{1F1F8}\u{1F1F0}", name: "Slovakia", digits: 9 },
  { code: "+36", flag: "\u{1F1ED}\u{1F1FA}", name: "Hungary", digits: 9 },
  { code: "+40", flag: "\u{1F1F7}\u{1F1F4}", name: "Romania", digits: 9 },
  { code: "+359", flag: "\u{1F1E7}\u{1F1EC}", name: "Bulgaria", digits: 9 },
  { code: "+385", flag: "\u{1F1ED}\u{1F1F7}", name: "Croatia", digits: 9 },
  { code: "+386", flag: "\u{1F1F8}\u{1F1EE}", name: "Slovenia", digits: 8 },
  { code: "+381", flag: "\u{1F1F7}\u{1F1F8}", name: "Serbia", digits: 9 },
  { code: "+387", flag: "\u{1F1E7}\u{1F1E6}", name: "Bosnia & Herzegovina", digits: 8 },
  { code: "+382", flag: "\u{1F1F2}\u{1F1EA}", name: "Montenegro", digits: 8 },
  { code: "+389", flag: "\u{1F1F2}\u{1F1F0}", name: "North Macedonia", digits: 8 },
  { code: "+355", flag: "\u{1F1E6}\u{1F1F1}", name: "Albania", digits: 9 },
  { code: "+383", flag: "\u{1F1FD}\u{1F1F0}", name: "Kosovo", digits: 8 },
  { code: "+30", flag: "\u{1F1EC}\u{1F1F7}", name: "Greece", digits: 10 },
  { code: "+90", flag: "\u{1F1F9}\u{1F1F7}", name: "Turkey", digits: 10 },
  { code: "+357", flag: "\u{1F1E8}\u{1F1FE}", name: "Cyprus", digits: 8 },
  { code: "+356", flag: "\u{1F1F2}\u{1F1F9}", name: "Malta", digits: 8 },
  { code: "+354", flag: "\u{1F1EE}\u{1F1F8}", name: "Iceland", digits: 7 },
  { code: "+352", flag: "\u{1F1F1}\u{1F1FA}", name: "Luxembourg", digits: 9 },
  { code: "+370", flag: "\u{1F1F1}\u{1F1F9}", name: "Lithuania", digits: 8 },
  { code: "+371", flag: "\u{1F1F1}\u{1F1FB}", name: "Latvia", digits: 8 },
  { code: "+372", flag: "\u{1F1EA}\u{1F1EA}", name: "Estonia", digits: 8 },
  { code: "+380", flag: "\u{1F1FA}\u{1F1E6}", name: "Ukraine", digits: 9 },
  { code: "+375", flag: "\u{1F1E7}\u{1F1FE}", name: "Belarus", digits: 9 },
  { code: "+373", flag: "\u{1F1F2}\u{1F1E9}", name: "Moldova", digits: 8 },
  { code: "+7", flag: "\u{1F1F7}\u{1F1FA}", name: "Russia", digits: 10 },
  { code: "+995", flag: "\u{1F1EC}\u{1F1EA}", name: "Georgia", digits: 9 },
  { code: "+374", flag: "\u{1F1E6}\u{1F1F2}", name: "Armenia", digits: 8 },
  { code: "+994", flag: "\u{1F1E6}\u{1F1FF}", name: "Azerbaijan", digits: 9 },
  // Africa
  { code: "+234", flag: "\u{1F1F3}\u{1F1EC}", name: "Nigeria", digits: 10 },
  { code: "+233", flag: "\u{1F1EC}\u{1F1ED}", name: "Ghana", digits: 9 },
  { code: "+254", flag: "\u{1F1F0}\u{1F1EA}", name: "Kenya", digits: 9 },
  { code: "+27", flag: "\u{1F1FF}\u{1F1E6}", name: "South Africa", digits: 9 },
  { code: "+20", flag: "\u{1F1EA}\u{1F1EC}", name: "Egypt", digits: 10 },
  { code: "+212", flag: "\u{1F1F2}\u{1F1E6}", name: "Morocco", digits: 9 },
  { code: "+213", flag: "\u{1F1E9}\u{1F1FF}", name: "Algeria", digits: 9 },
  { code: "+216", flag: "\u{1F1F9}\u{1F1F3}", name: "Tunisia", digits: 8 },
  { code: "+218", flag: "\u{1F1F1}\u{1F1FE}", name: "Libya", digits: 9 },
  { code: "+251", flag: "\u{1F1EA}\u{1F1F9}", name: "Ethiopia", digits: 9 },
  { code: "+255", flag: "\u{1F1F9}\u{1F1FF}", name: "Tanzania", digits: 9 },
  { code: "+256", flag: "\u{1F1FA}\u{1F1EC}", name: "Uganda", digits: 9 },
  { code: "+250", flag: "\u{1F1F7}\u{1F1FC}", name: "Rwanda", digits: 9 },
  { code: "+243", flag: "\u{1F1E8}\u{1F1E9}", name: "DR Congo", digits: 9 },
  { code: "+237", flag: "\u{1F1E8}\u{1F1F2}", name: "Cameroon", digits: 9 },
  { code: "+225", flag: "\u{1F1E8}\u{1F1EE}", name: "C\u00F4te d'Ivoire", digits: 10 },
  { code: "+221", flag: "\u{1F1F8}\u{1F1F3}", name: "Senegal", digits: 9 },
  { code: "+228", flag: "\u{1F1F9}\u{1F1EC}", name: "Togo", digits: 8 },
  { code: "+229", flag: "\u{1F1E7}\u{1F1EF}", name: "Benin", digits: 8 },
  { code: "+226", flag: "\u{1F1E7}\u{1F1EB}", name: "Burkina Faso", digits: 8 },
  { code: "+223", flag: "\u{1F1F2}\u{1F1F1}", name: "Mali", digits: 8 },
  { code: "+227", flag: "\u{1F1F3}\u{1F1EA}", name: "Niger", digits: 8 },
  { code: "+224", flag: "\u{1F1EC}\u{1F1F3}", name: "Guinea", digits: 9 },
  { code: "+232", flag: "\u{1F1F8}\u{1F1F1}", name: "Sierra Leone", digits: 8 },
  { code: "+231", flag: "\u{1F1F1}\u{1F1F7}", name: "Liberia", digits: 7 },
  { code: "+220", flag: "\u{1F1EC}\u{1F1F2}", name: "Gambia", digits: 7 },
  { code: "+238", flag: "\u{1F1E8}\u{1F1FB}", name: "Cape Verde", digits: 7 },
  { code: "+244", flag: "\u{1F1E6}\u{1F1F4}", name: "Angola", digits: 9 },
  { code: "+258", flag: "\u{1F1F2}\u{1F1FF}", name: "Mozambique", digits: 9 },
  { code: "+260", flag: "\u{1F1FF}\u{1F1F2}", name: "Zambia", digits: 9 },
  { code: "+263", flag: "\u{1F1FF}\u{1F1FC}", name: "Zimbabwe", digits: 9 },
  { code: "+267", flag: "\u{1F1E7}\u{1F1FC}", name: "Botswana", digits: 8 },
  { code: "+264", flag: "\u{1F1F3}\u{1F1E6}", name: "Namibia", digits: 9 },
  { code: "+230", flag: "\u{1F1F2}\u{1F1FA}", name: "Mauritius", digits: 8 },
  { code: "+261", flag: "\u{1F1F2}\u{1F1EC}", name: "Madagascar", digits: 9 },
  { code: "+252", flag: "\u{1F1F8}\u{1F1F4}", name: "Somalia", digits: 8 },
  { code: "+253", flag: "\u{1F1E9}\u{1F1EF}", name: "Djibouti", digits: 8 },
  { code: "+291", flag: "\u{1F1EA}\u{1F1F7}", name: "Eritrea", digits: 7 },
  { code: "+249", flag: "\u{1F1F8}\u{1F1E9}", name: "Sudan", digits: 9 },
  { code: "+211", flag: "\u{1F1F8}\u{1F1F8}", name: "South Sudan", digits: 9 },
  { code: "+235", flag: "\u{1F1F9}\u{1F1E9}", name: "Chad", digits: 8 },
  { code: "+236", flag: "\u{1F1E8}\u{1F1EB}", name: "Central African Republic", digits: 8 },
  { code: "+241", flag: "\u{1F1EC}\u{1F1E6}", name: "Gabon", digits: 7 },
  { code: "+242", flag: "\u{1F1E8}\u{1F1EC}", name: "Congo", digits: 9 },
  { code: "+240", flag: "\u{1F1EC}\u{1F1F6}", name: "Equatorial Guinea", digits: 9 },
  { code: "+239", flag: "\u{1F1F8}\u{1F1F9}", name: "S\u00E3o Tom\u00E9 & Pr\u00EDncipe", digits: 7 },
  { code: "+265", flag: "\u{1F1F2}\u{1F1FC}", name: "Malawi", digits: 9 },
  { code: "+266", flag: "\u{1F1F1}\u{1F1F8}", name: "Lesotho", digits: 8 },
  { code: "+268", flag: "\u{1F1F8}\u{1F1FF}", name: "Eswatini", digits: 8 },
  { code: "+257", flag: "\u{1F1E7}\u{1F1EE}", name: "Burundi", digits: 8 },
  { code: "+269", flag: "\u{1F1F0}\u{1F1F2}", name: "Comoros", digits: 7 },
  { code: "+262", flag: "\u{1F1F7}\u{1F1EA}", name: "R\u00E9union", digits: 9 },
  { code: "+248", flag: "\u{1F1F8}\u{1F1E8}", name: "Seychelles", digits: 7 },
  // Middle East
  { code: "+966", flag: "\u{1F1F8}\u{1F1E6}", name: "Saudi Arabia", digits: 9 },
  { code: "+971", flag: "\u{1F1E6}\u{1F1EA}", name: "United Arab Emirates", digits: 9 },
  { code: "+974", flag: "\u{1F1F6}\u{1F1E6}", name: "Qatar", digits: 8 },
  { code: "+973", flag: "\u{1F1E7}\u{1F1ED}", name: "Bahrain", digits: 8 },
  { code: "+968", flag: "\u{1F1F4}\u{1F1F2}", name: "Oman", digits: 8 },
  { code: "+965", flag: "\u{1F1F0}\u{1F1FC}", name: "Kuwait", digits: 8 },
  { code: "+962", flag: "\u{1F1EF}\u{1F1F4}", name: "Jordan", digits: 9 },
  { code: "+961", flag: "\u{1F1F1}\u{1F1E7}", name: "Lebanon", digits: 8 },
  { code: "+972", flag: "\u{1F1EE}\u{1F1F1}", name: "Israel", digits: 9 },
  { code: "+970", flag: "\u{1F1F5}\u{1F1F8}", name: "Palestine", digits: 9 },
  { code: "+964", flag: "\u{1F1EE}\u{1F1F6}", name: "Iraq", digits: 10 },
  { code: "+963", flag: "\u{1F1F8}\u{1F1FE}", name: "Syria", digits: 9 },
  { code: "+967", flag: "\u{1F1FE}\u{1F1EA}", name: "Yemen", digits: 9 },
  { code: "+98", flag: "\u{1F1EE}\u{1F1F7}", name: "Iran", digits: 10 },
  // South Asia
  { code: "+91", flag: "\u{1F1EE}\u{1F1F3}", name: "India", digits: 10 },
  { code: "+92", flag: "\u{1F1F5}\u{1F1F0}", name: "Pakistan", digits: 10 },
  { code: "+880", flag: "\u{1F1E7}\u{1F1E9}", name: "Bangladesh", digits: 10 },
  { code: "+94", flag: "\u{1F1F1}\u{1F1F0}", name: "Sri Lanka", digits: 9 },
  { code: "+977", flag: "\u{1F1F3}\u{1F1F5}", name: "Nepal", digits: 10 },
  { code: "+93", flag: "\u{1F1E6}\u{1F1EB}", name: "Afghanistan", digits: 9 },
  { code: "+960", flag: "\u{1F1F2}\u{1F1FB}", name: "Maldives", digits: 7 },
  { code: "+975", flag: "\u{1F1E7}\u{1F1F9}", name: "Bhutan", digits: 8 },
  // East Asia
  { code: "+86", flag: "\u{1F1E8}\u{1F1F3}", name: "China", digits: 11 },
  { code: "+81", flag: "\u{1F1EF}\u{1F1F5}", name: "Japan", digits: 10 },
  { code: "+82", flag: "\u{1F1F0}\u{1F1F7}", name: "South Korea", digits: 10 },
  { code: "+852", flag: "\u{1F1ED}\u{1F1F0}", name: "Hong Kong", digits: 8 },
  { code: "+853", flag: "\u{1F1F2}\u{1F1F4}", name: "Macau", digits: 8 },
  { code: "+886", flag: "\u{1F1F9}\u{1F1FC}", name: "Taiwan", digits: 9 },
  { code: "+976", flag: "\u{1F1F2}\u{1F1F3}", name: "Mongolia", digits: 8 },
  // Southeast Asia
  { code: "+65", flag: "\u{1F1F8}\u{1F1EC}", name: "Singapore", digits: 8 },
  { code: "+60", flag: "\u{1F1F2}\u{1F1FE}", name: "Malaysia", digits: 10 },
  { code: "+62", flag: "\u{1F1EE}\u{1F1E9}", name: "Indonesia", digits: 11 },
  { code: "+63", flag: "\u{1F1F5}\u{1F1ED}", name: "Philippines", digits: 10 },
  { code: "+66", flag: "\u{1F1F9}\u{1F1ED}", name: "Thailand", digits: 9 },
  { code: "+84", flag: "\u{1F1FB}\u{1F1F3}", name: "Vietnam", digits: 9 },
  { code: "+95", flag: "\u{1F1F2}\u{1F1F2}", name: "Myanmar", digits: 9 },
  { code: "+855", flag: "\u{1F1F0}\u{1F1ED}", name: "Cambodia", digits: 9 },
  { code: "+856", flag: "\u{1F1F1}\u{1F1E6}", name: "Laos", digits: 9 },
  { code: "+673", flag: "\u{1F1E7}\u{1F1F3}", name: "Brunei", digits: 7 },
  { code: "+670", flag: "\u{1F1F9}\u{1F1F1}", name: "Timor-Leste", digits: 8 },
  // Central Asia
  { code: "+7", flag: "\u{1F1F0}\u{1F1FF}", name: "Kazakhstan", digits: 10 },
  { code: "+998", flag: "\u{1F1FA}\u{1F1FF}", name: "Uzbekistan", digits: 9 },
  { code: "+996", flag: "\u{1F1F0}\u{1F1EC}", name: "Kyrgyzstan", digits: 9 },
  { code: "+992", flag: "\u{1F1F9}\u{1F1EF}", name: "Tajikistan", digits: 9 },
  { code: "+993", flag: "\u{1F1F9}\u{1F1F2}", name: "Turkmenistan", digits: 8 },
  // Oceania
  { code: "+61", flag: "\u{1F1E6}\u{1F1FA}", name: "Australia", digits: 9 },
  { code: "+64", flag: "\u{1F1F3}\u{1F1FF}", name: "New Zealand", digits: 9 },
  { code: "+675", flag: "\u{1F1F5}\u{1F1EC}", name: "Papua New Guinea", digits: 8 },
  { code: "+679", flag: "\u{1F1EB}\u{1F1EF}", name: "Fiji", digits: 7 },
  { code: "+685", flag: "\u{1F1FC}\u{1F1F8}", name: "Samoa", digits: 7 },
  { code: "+676", flag: "\u{1F1F9}\u{1F1F4}", name: "Tonga", digits: 7 },
  { code: "+678", flag: "\u{1F1FB}\u{1F1FA}", name: "Vanuatu", digits: 7 },
  { code: "+677", flag: "\u{1F1F8}\u{1F1E7}", name: "Solomon Islands", digits: 7 },
  { code: "+686", flag: "\u{1F1F0}\u{1F1EE}", name: "Kiribati", digits: 8 },
  { code: "+691", flag: "\u{1F1EB}\u{1F1F2}", name: "Micronesia", digits: 7 },
  { code: "+680", flag: "\u{1F1F5}\u{1F1FC}", name: "Palau", digits: 7 },
  { code: "+692", flag: "\u{1F1F2}\u{1F1ED}", name: "Marshall Islands", digits: 7 },
  { code: "+688", flag: "\u{1F1F9}\u{1F1FB}", name: "Tuvalu", digits: 6 },
  { code: "+674", flag: "\u{1F1F3}\u{1F1F7}", name: "Nauru", digits: 7 },
];

// ── Helpers ────────────────────────────────────────────────────────────
function detectCountry(value: string): CountryEntry {
  if (!value) return COUNTRY_CODES[0];
  const clean = value.startsWith("+") ? value : `+${value}`;
  // Sort by code length descending so longer codes match first (+1876 before +1)
  const sorted = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
  for (const entry of sorted) {
    if (clean.startsWith(entry.code)) return entry;
  }
  return COUNTRY_CODES[0];
}

function stripCode(value: string, code: string): string {
  const clean = value.startsWith("+") ? value : `+${value}`;
  if (clean.startsWith(code)) return clean.slice(code.length);
  return value.replace(/^\+/, "");
}

// ── Props ──────────────────────────────────────────────────────────────
interface PhoneInputProps {
  value: string;
  onChange: (fullPhone: string) => void;
  placeholder?: string;
  error?: string;
}

// ── Component ──────────────────────────────────────────────────────────
export function PhoneInput({
  value,
  onChange,
  placeholder,
  error,
}: PhoneInputProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState("");

  const selected = detectCountry(value);
  const localDigits = stripCode(value, selected.code);

  const filtered = useMemo(() => {
    if (!search) return COUNTRY_CODES;
    const q = search.toLowerCase();
    return COUNTRY_CODES.filter(
      (e) =>
        e.name.toLowerCase().includes(q) || e.code.includes(q),
    );
  }, [search]);

  const handleDigitChange = useCallback(
    (text: string) => {
      const digits = text.replace(/\D/g, "").slice(0, selected.digits);
      onChange(`${selected.code}${digits}`);
    },
    [selected, onChange],
  );

  const handleCountrySelect = useCallback(
    (entry: CountryEntry) => {
      setModalVisible(false);
      setSearch("");
      onChange(`${entry.code}${localDigits.slice(0, entry.digits)}`);
    },
    [localDigits, onChange],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: CountryEntry; index: number }) => {
      const isSelected =
        item.code === selected.code && item.name === selected.name;
      return (
        <Pressable
          onPress={() => handleCountrySelect(item)}
          className={`flex-row items-center px-4 py-3 ${
            isSelected ? "bg-primary-50" : ""
          }`}
          style={{
            borderBottomWidth: 1,
            borderBottomColor: COLORS.gray[100],
          }}
          key={`${item.code}-${item.name}-${index}`}
        >
          <Text className="text-xl mr-3">{item.flag}</Text>
          <Text
            className={`flex-1 text-base ${
              isSelected ? "font-semibold text-primary-900" : "text-dark-800"
            }`}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <Text className="text-sm text-dark-400 ml-2">{item.code}</Text>
        </Pressable>
      );
    },
    [selected, handleCountrySelect],
  );

  const keyExtractor = useCallback(
    (item: CountryEntry, index: number) =>
      `${item.code}-${item.name}-${index}`,
    [],
  );

  return (
    <View>
      <View
        className={`flex-row items-center rounded-xl border ${
          error ? "border-red-500" : "border-dark-200"
        } bg-dark-50`}
      >
        {/* Country selector button */}
        <Pressable
          onPress={() => setModalVisible(true)}
          className="flex-row items-center pl-4 pr-2 py-3"
        >
          <Text className="text-base mr-1">{selected.flag}</Text>
          <Text className="text-base font-medium text-dark-800">
            {selected.code}
          </Text>
          <Ionicons
            name="chevron-down"
            size={14}
            color={COLORS.gray[500]}
            style={{ marginLeft: 2 }}
          />
        </Pressable>

        {/* Divider */}
        <View
          style={{
            width: 1,
            height: 24,
            backgroundColor: COLORS.gray[300],
          }}
        />

        {/* Phone number input */}
        <TextInput
          value={localDigits}
          onChangeText={handleDigitChange}
          placeholder={placeholder || `${selected.digits}-digit number`}
          placeholderTextColor={COLORS.gray[400]}
          keyboardType="phone-pad"
          autoComplete="tel"
          maxLength={selected.digits}
          className="flex-1 px-3 py-3 text-base text-dark-800"
        />
      </View>

      {error ? (
        <Text className="mt-1 text-xs text-red-500">{error}</Text>
      ) : null}

      {/* Country picker modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle={Platform.OS === "ios" ? "pageSheet" : undefined}
        onRequestClose={() => {
          setModalVisible(false);
          setSearch("");
        }}
      >
        <SafeAreaView className="flex-1 bg-white">
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-dark-200">
            <Text className="text-lg font-bold text-dark-800">
              Select Country
            </Text>
            <Pressable
              onPress={() => {
                setModalVisible(false);
                setSearch("");
              }}
              className="p-2"
            >
              <Ionicons name="close" size={24} color={COLORS.gray[600]} />
            </Pressable>
          </View>

          {/* Search bar */}
          <View className="px-4 py-3 border-b border-dark-100">
            <View className="flex-row items-center rounded-xl bg-dark-50 px-3 py-2.5">
              <Ionicons
                name="search"
                size={18}
                color={COLORS.gray[400]}
              />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search country or dial code..."
                placeholderTextColor={COLORS.gray[400]}
                autoFocus
                autoCapitalize="none"
                autoCorrect={false}
                className="flex-1 ml-2 text-base text-dark-800"
              />
              {search.length > 0 && (
                <Pressable onPress={() => setSearch("")}>
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={COLORS.gray[400]}
                  />
                </Pressable>
              )}
            </View>
          </View>

          {/* Country list */}
          <FlatList
            data={filtered}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={20}
            maxToRenderPerBatch={30}
            windowSize={10}
            ListEmptyComponent={
              <View className="items-center py-10">
                <Text className="text-base text-dark-400">
                  No countries found
                </Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

export default PhoneInput;

import { StyleSheet, Dimensions } from "react-native";

const { width } = Dimensions.get("window");

export default StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F2F4F8",
  },

  /* HEADER */
  header: {
    height: 140,
    backgroundColor: "#5A67D8",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  headerTitle: {
    color: "#FFF",
    fontSize: 28,
    fontWeight: "700",
  },

  /* USER CARD */
  userCard: {
    backgroundColor: "#FFF",
    marginHorizontal: 20,
    marginTop: -40,
    borderRadius: 24,
    alignItems: "center",
    padding: 25,
    elevation: 8,
  },

  avatarWrapper: {
    marginBottom: 10,
  },

  avatarRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: "#5A67D8",
    alignItems: "center",
    justifyContent: "center",
  },

  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#D9E1FF",
  },

  onlineDot: {
    position: "absolute",
    bottom: 5,
    right: 5,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#00C853",
    borderWidth: 2,
    borderColor: "#FFF",
  },

  name: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 10,
  },

  email: {
    color: "#777",
    marginBottom: 15,
  },

  editBtn: {
    backgroundColor: "#EEF1FF",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },

  editTxt: {
    color: "#5A67D8",
    fontWeight: "600",
  },

  /* STATS */
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginTop: 20,
  },

  statCard: {
    width: width / 3.5,
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 18,
    alignItems: "center",
    elevation: 4,
  },

  statNum: {
    fontSize: 18,
    fontWeight: "700",
    color: "#5A67D8",
  },

  statLabel: {
    fontSize: 12,
    color: "#777",
    marginTop: 4,
  },

  /* SCHEDULE */
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 20,
    marginTop: 25,
    marginBottom: 10,
  },

  scheduleCard: {
    backgroundColor: "#FFF",
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 20,
    elevation: 4,
  },

  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },

  time: {
    width: 60,
    color: "#777",
    fontWeight: "600",
  },

  sessionBlock: {
    flex: 1,
    height: 45,
    borderRadius: 14,
    justifyContent: "center",
    paddingLeft: 15,
  },

  sessionText: {
    color: "#FFF",
    fontWeight: "700",
  },

  /* FLOATING */
  pupBtn: {
    position: "absolute",
    right: 25,
    bottom: 90,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#5A67D8",
    alignItems: "center",
    justifyContent: "center",
    elevation: 10,
  },

  pupTxt: {
    color: "#FFF",
    fontWeight: "800",
  },

  /* BOTTOM */
  bottomBar: {
    height: 70,
    backgroundColor: "#FFF",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    elevation: 15,
  },

  icon: {
    fontSize: 20,
    opacity: 0.5,
  },

  iconActive: {
    fontSize: 24,
  },






  /* SIDE MENU */
  sideMenu: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: width * 0.75,
    backgroundColor: "#111827",
    paddingTop: 60,
    paddingHorizontal: 20,
    elevation: 20,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },

  close: {
    color: "#fff",
    fontSize: 22,
    marginBottom: 30,
  },

  section: {
    marginTop: 20,
  },

  optionItem: {
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#1F2937",
  },

  optionText: {
    color: "#E5E7EB",
    fontSize: 16,
    fontWeight: "500",
  },

  logoutButton: {
    marginTop: 40,
    backgroundColor: "#EF4444",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },

  logoutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },

  settingsIcon: {
    fontSize: 22,
    color: "#fff",
  },














});
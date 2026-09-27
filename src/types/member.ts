export interface Member {
  memberNo: string;        // सदस्य नं. (e.g. "M-001")
  fullName: string;        // सदस्यको नाम (e.g. "राम बहादुर चौधरी")
  fullNameEn?: string;     // Name in English
  citizenshipNo?: string;  // नागरिकता नं.
  phone: string;           // मोबाइल नं.
  address: string;         // ठेगाना (e.g. "गौरीगंगा-१, चौमाला")
  wardNo: string;          // वडा नं.
  gender: 'महिला' | 'पुरुष' | 'अन्य' | 'संस्थागत';
  membershipDate: string;  // सदस्यता मिति (वि.सं.)
  status: 'ACTIVE' | 'INACTIVE';
  shareKitta: number;      // कुल शेयर कित्ता
  shareAmount: number;     // कुल शेयर रकम (रु.)
  savingBalance: number;   // कुल बचत मौज्दात (रु.)
  loanOutstanding: number; // कुल ऋण बाँकी (रु.)
}

export interface ShareBookEntry {
  id: string;
  date: string;            // AD Date
  bsDate: string;          // BS Date (वि.सं.)
  memberNo: string;        // सदस्य नं.
  memberName: string;      // सदस्यको नाम
  voucherNo: string;       // भौचर / रसिद नं.
  type: 'PURCHASE' | 'REFUND' | 'BONUS';
  kitta: number;           // कित्ता संख्या
  rate: number;            // प्रति कित्ता दर (रु १००)
  debit: number;           // फिर्ता / डेबिट (रु.)
  credit: number;          // खरिद / क्रेडिट (रु.)
  balance: number;         // कुल शेयर बाँकी मौज्दात (रु.)
  narration: string;       // कैफियत
}

export interface SavingBookEntry {
  id: string;
  date: string;            // AD Date
  bsDate: string;          // BS Date (वि.सं.)
  memberNo: string;        // सदस्य नं.
  memberName: string;      // सदस्यको नाम
  accountNo: string;       // बचत खाता नं.
  savingType: string;      // बचतको प्रकार (नियमित, ऐच्छिक, बाल, आवधिक)
  voucherNo: string;       // भौचर / रसिद नं.
  deposit: number;         // जम्मा (क्रेडिट रु.)
  withdraw: number;        // भुक्तानी / फिर्ता (डेबिट रु.)
  interest: number;        // ब्याज (रु.)
  balance: number;         // बाँकी बचत मौज्दात (रु.)
  narration: string;       // कैफियत
}

export interface LoanBookEntry {
  id: string;
  date: string;            // AD Date
  bsDate: string;          // BS Date (वि.सं.)
  memberNo: string;        // सदस्य नं.
  memberName: string;      // सदस्यको नाम
  loanAccountNo: string;   // ऋण खाता नं.
  loanPurpose: string;     // ऋण प्रयोजन (कृषि, पशुपालन, व्यवसाय, घर खर्च)
  voucherNo: string;       // भौचर नं.
  disbursement: number;    // ऋण लगानी / निकासा (डेबिट रु.)
  principalRepaid: number; // साँवा असुली (क्रेडिट रु.)
  interestPaid: number;    // ब्याज असुली (रु.)
  penalty: number;         // हर्जाना (रु.)
  balancePrincipal: number;// बाँकी ऋण साँवा (रु.)
  narration: string;       // कैफियत
}

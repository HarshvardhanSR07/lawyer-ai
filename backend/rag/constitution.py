"""
Indian Constitution — Key Articles for Legal RAG
Embedded inline to avoid network dependency on GitHub URLs that may go offline.
"""
from backend.rag.retrieval import USER_DOCUMENTS

CONSTITUTION_ARTICLES = [
    {
        "document_name": "Constitution of India",
        "text": "Article 14: Equality before law. The State shall not deny to any person equality before the law or the equal protection of the laws within the territory of India. Prohibition of discrimination on grounds of religion, race, caste, sex or place of birth.",
        "page_number": 14
    },
    {
        "document_name": "Constitution of India",
        "text": "Article 15: Prohibition of discrimination on grounds of religion, race, caste, sex or place of birth. (1) The State shall not discriminate against any citizen on grounds only of religion, race, caste, sex, place of birth or any of them. (2) No citizen shall, on grounds only of religion, race, caste, sex, place of birth or any of them, be subject to any disability, liability, restriction or condition with regard to (a) access to shops, public restaurants, hotels and places of public entertainment; or (b) the use of wells, tanks, bathing ghats, roads and places of public resort maintained wholly or partly out of State funds or dedicated to the use of the general public.",
        "page_number": 15
    },
    {
        "document_name": "Constitution of India",
        "text": "Article 19: Protection of certain rights regarding freedom of speech, etc. (1) All citizens shall have the right (a) to freedom of speech and expression; (b) to assemble peaceably and without arms; (c) to form associations or unions; (d) to move freely throughout the territory of India; (e) to reside and settle in any part of the territory of India; (g) to practise any profession, or to carry on any occupation, trade or business.",
        "page_number": 19
    },
    {
        "document_name": "Constitution of India",
        "text": "Article 20: Protection in respect of conviction for offences. (1) No person shall be convicted of any offence except for violation of the law in force at the time of the commission of the act charged as an offence, nor be subjected to a penalty greater than that which might have been inflicted under the law in force at the time of the commission of the offence. (2) No person shall be prosecuted and punished for the same offence more than once. (3) No person accused of any offence shall be compelled to be a witness against himself.",
        "page_number": 20
    },
    {
        "document_name": "Constitution of India",
        "text": "Article 21: Protection of life and personal liberty. No person shall be deprived of his life or personal liberty except according to procedure established by law. This article has been interpreted by the Supreme Court to include the right to live with dignity, right to livelihood, right to privacy, right to shelter, right to health, right to education, right to a speedy trial, right against solitary confinement, right to legal aid, and right against delayed execution.",
        "page_number": 21
    },
    {
        "document_name": "Constitution of India",
        "text": "Article 21A: Right to education. The State shall provide free and compulsory education to all children of the age of six to fourteen years in such manner as the State may, by law, determine. (Inserted by the Constitution (Eighty-sixth Amendment) Act, 2002.)",
        "page_number": 211
    },
    {
        "document_name": "Constitution of India",
        "text": "Article 22: Protection against arrest and detention in certain cases. (1) No person who is arrested shall be detained in custody without being informed, as soon as may be, of the grounds for such arrest nor shall he be denied the right to consult, and to be defended by, a legal practitioner of his choice. (2) Every person who is arrested and detained in custody shall be produced before the nearest magistrate within a period of twenty-four hours of such arrest excluding the time necessary for the journey from the place of arrest to the court of the magistrate and no such person shall be detained in custody beyond the said period without the authority of a magistrate.",
        "page_number": 22
    },
    {
        "document_name": "Constitution of India",
        "text": "Article 25: Freedom of conscience and free profession, practice and propagation of religion. (1) Subject to public order, morality and health and to the other provisions of this Part, all persons are equally entitled to freedom of conscience and the right freely to profess, practise and propagate religion. (2) Nothing in this article shall affect the operation of any existing law or prevent the State from making any law (a) regulating or restricting any economic, financial, political or other secular activity which may be associated with religious practice; (b) providing for social welfare and reform or the throwing open of Hindu religious institutions of a public character to all classes and sections of Hindus.",
        "page_number": 25
    },
    {
        "document_name": "Constitution of India",
        "text": "Article 32: Remedies for enforcement of rights conferred by this Part. (1) The right to move the Supreme Court by appropriate proceedings for the enforcement of the rights conferred by this Part is guaranteed. (2) The Supreme Court shall have power to issue directions or orders or writs, including writs in the nature of habeas corpus, mandamus, prohibition, quo warranto and certiorari, whichever may be appropriate, for the enforcement of any of the rights conferred by this Part.",
        "page_number": 32
    },
    {
        "document_name": "Constitution of India",
        "text": "Article 44: Uniform civil code for the citizens. The State shall endeavour to secure for the citizens a uniform civil code throughout the territory of India. This is a Directive Principle of State Policy. The Supreme Court has on multiple occasions urged the government to implement a uniform civil code.",
        "page_number": 44
    },
    {
        "document_name": "Constitution of India",
        "text": "Article 226: Power of High Courts to issue certain writs. (1) Notwithstanding anything in Article 32, every High Court shall have power, throughout the territories in relation to which it exercises jurisdiction, to issue to any person or authority, including in appropriate cases, any Government, within those territories directions, orders or writs, including writs in the nature of habeas corpus, mandamus, prohibition, quo warranto and certiorari, or any of them, for the enforcement of any of the rights conferred by Part III and for any other purpose.",
        "page_number": 226
    },
    {
        "document_name": "Constitution of India",
        "text": "Article 300A: Persons not to be deprived of property save by authority of law. No person shall be deprived of his property save by authority of law. This article was substituted by the Constitution (Forty-fourth Amendment) Act, 1978, replacing the earlier fundamental right to property under Article 19(1)(f) and Article 31.",
        "page_number": 300
    },
    {
        "document_name": "Constitution of India",
        "text": "Article 352: Proclamation of Emergency. (1) If the President is satisfied that a grave emergency exists whereby the security of India or of any part of the territory thereof is threatened, whether by war or external aggression or armed rebellion, he may, by Proclamation, make a declaration to that effect in respect of the whole of India or of such part of the territory thereof as may be specified in the Proclamation.",
        "page_number": 352
    },
    {
        "document_name": "Constitution of India",
        "text": "Article 356: Provisions in case of failure of constitutional machinery in States. (1) If the President, on receipt of a report from the Governor of a State or otherwise, is satisfied that a situation has arisen in which the Government of the State cannot be carried on in accordance with the provisions of this Constitution, the President may by Proclamation (a) assume to himself all or any of the functions of the Government of the State.",
        "page_number": 356
    },
    {
        "document_name": "Constitution of India",
        "text": "Article 368: Power of Parliament to amend the Constitution and procedure therefor. (1) Notwithstanding anything in this Constitution, Parliament may in exercise of its constituent power amend by way of addition, variation or repeal any provision of this Constitution in accordance with the procedure laid down in this article. (2) An amendment of this Constitution may be initiated only by the introduction of a Bill for the purpose in either House of Parliament, and when the Bill is passed in each House by a majority of the total membership of that House and by a majority of not less than two-thirds of the members of that House present and voting, it shall be presented to the President who shall give his assent to the Bill and thereupon the Constitution shall stand amended in accordance with the terms of the Bill.",
        "page_number": 368
    },
    {
        "document_name": "Constitution of India",
        "text": "Preamble: WE, THE PEOPLE OF INDIA, having solemnly resolved to constitute India into a SOVEREIGN SOCIALIST SECULAR DEMOCRATIC REPUBLIC and to secure to all its citizens: JUSTICE, social, economic and political; LIBERTY of thought, expression, belief, faith and worship; EQUALITY of status and of opportunity; and to promote among them all FRATERNITY assuring the dignity of the individual and the unity and integrity of the Nation; IN OUR CONSTITUENT ASSEMBLY this twenty-sixth day of November, 1949, do HEREBY ADOPT, ENACT AND GIVE TO OURSELVES THIS CONSTITUTION.",
        "page_number": 0
    },
    {
        "document_name": "Constitution of India",
        "text": "Article 39A: Equal justice and free legal aid. The State shall secure that the operation of the legal system promotes justice, on a basis of equal opportunity, and shall, in particular, provide free legal aid, by suitable legislation or schemes or in any other way, to ensure that opportunities for securing justice are not denied to any citizen by reason of economic or other disabilities.",
        "page_number": 39
    },
    {
        "document_name": "Constitution of India",
        "text": "Article 50: Separation of judiciary from executive. The State shall take steps to separate the judiciary from the executive in the public services of the State. This Directive Principle ensures the independence of the judiciary from executive control.",
        "page_number": 50
    },
    {
        "document_name": "Constitution of India",
        "text": "Article 136: Special leave to appeal by the Supreme Court. (1) Notwithstanding anything in this Chapter, the Supreme Court may, in its discretion, grant special leave to appeal from any judgment, decree, determination, sentence or order in any cause or matter passed or made by any court or tribunal in the territory of India.",
        "page_number": 136
    },
    {
        "document_name": "Constitution of India",
        "text": "Article 141: Law declared by Supreme Court to be binding on all courts. The law declared by the Supreme Court shall be binding on all courts within the territory of India.",
        "page_number": 141
    },
    {
        "document_name": "Constitution of India",
        "text": "Article 142: Enforcement of decrees and orders of Supreme Court and orders as to discovery, etc. (1) The Supreme Court in the exercise of its jurisdiction may pass such decree or make such order as is necessary for doing complete justice in any cause or matter pending before it, and any decree so passed or order so made shall be enforceable throughout the territory of India.",
        "page_number": 142
    }
]


def load_constitution():
    """
    Loads key Indian Constitution articles into the in-memory RAG store.
    Uses embedded data to avoid dependency on external URLs.
    """
    USER_DOCUMENTS[0] = CONSTITUTION_ARTICLES
    print(f"Loaded {len(CONSTITUTION_ARTICLES)} Constitutional articles into memory.")


# Run on import
load_constitution()

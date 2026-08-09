import json

def get_mock_case_knowledge():
    return [
        {
            "id": 1,
            "document_name": "Contract.pdf",
            "page_number": 4,
            "document_type": "contract",
            "case_id": "CASE001",
            "text": "Clause 7: Termination. Either party may terminate this agreement upon a 30-day written notice to the other party. Immediate termination is not permitted unless there is a material breach."
        },
        {
            "id": 2,
            "document_name": "Contract.pdf",
            "page_number": 5,
            "document_type": "contract",
            "case_id": "CASE001",
            "text": "Clause 9: Material Breach. In the event of a material breach, such as failure to deliver the software within the stipulated time, the aggrieved party may terminate the agreement immediately without the 30-day notice."
        },
        {
            "id": 3,
            "document_name": "Email_Evidence.pdf",
            "page_number": 1,
            "document_type": "email",
            "case_id": "CASE001",
            "text": "Exhibit B: Email from ABC Technologies on Jan 5th stating 'We hereby provide 30 days notice to terminate the contract as per Clause 7.' The contract ended on Feb 4th."
        }
    ]

def get_mock_legal_knowledge():
    return [
        {
            "id": 1,
            "source": "Indian Contract Act, 1872",
            "section": "Section 39",
            "document_name": "ICA_1872",
            "page_number": 12,
            "document_type": "act",
            "jurisdiction": "India",
            "text": "Effect of refusal of party to perform promise wholly. When a party to a contract has refused to perform, or disabled himself from performing, his promise in its entirety, the promisee may put an end to the contract, unless he has signified, by words or conduct, his acquiescence in its continuance."
        },
        {
            "id": 2,
            "source": "Indian Contract Act, 1872",
            "section": "Section 73",
            "document_name": "ICA_1872",
            "page_number": 25,
            "document_type": "act",
            "jurisdiction": "India",
            "text": "Compensation for loss or damage caused by breach of contract. When a contract has been broken, the party who suffers by such breach is entitled to receive, from the party who has broken the contract, compensation for any loss or damage caused to him thereby, which naturally arose in the usual course of things from such breach."
        }
    ]
